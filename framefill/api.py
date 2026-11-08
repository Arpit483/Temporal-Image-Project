"""FastAPI backend (extended). Run: uvicorn framefill.api:app --port 8000"""
import asyncio
import json
import os
import tempfile
import uuid
from pathlib import Path

# Load .env file for OPENROUTER_API_KEY and other env vars
try:
    from dotenv import load_dotenv
    load_dotenv(Path(__file__).resolve().parent.parent / ".env")
except ImportError:
    pass  # python-dotenv optional; key can still be set via real env var

import numpy as np
import pandas as pd
import xarray as xr
from fastapi import BackgroundTasks, FastAPI, File, Form, HTTPException, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse, Response
from fastapi.staticfiles import StaticFiles

from . import __version__, render
from .engines import Interpolator
from .exports import make_gif, make_png_zip
from .io_nc import WARNING, check_pair, load_frame, write_framefill_nc
from .jobs import (
    CANCELLED,
    DONE,
    FAILED,
    PENDING,
    RUNNING,
    cancel_job,
    create_job,
    get_job,
    init_db,
    list_jobs,
    register_task,
    remove_task,
    update_job,
)
from .metrics import evaluate

# ---------------------------------------------------------------------------
# Setup
# ---------------------------------------------------------------------------
MAX_UPLOAD = 200 * 1024 * 1024
OUT = Path(tempfile.gettempdir()) / "framefill_out"
OUT.mkdir(exist_ok=True)
RESULTS_DIR = Path(__file__).resolve().parent.parent / "results"
SEQUENCES_DIR = Path(__file__).resolve().parent.parent / "results"

app = FastAPI(title="FrameFill", version=__version__)

# CORS — localhost only
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",
        "http://localhost:5173",
        "http://localhost:8000",
        "http://127.0.0.1:3000",
        "http://127.0.0.1:5173",
        "http://127.0.0.1:8000",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

engine = Interpolator()
init_db()


# ---------------------------------------------------------------------------
# Health
# ---------------------------------------------------------------------------
@app.get("/api/health")
def health():
    import platform
    import sys
    rife_ok = engine.rife_available
    device = "cpu"
    try:
        import torch
        device = "cuda" if torch.cuda.is_available() else "cpu"
    except ImportError:
        pass
    return dict(
        status="ok",
        version=__version__,
        python=sys.version.split()[0],
        platform=platform.system(),
        device=device,
        rife_available=rife_ok,
        rife_error=engine.rife_error,
        rife_dir=engine.rife_dir,
        fallback="DIS-only (RIFE weights not found)" if not rife_ok else None,
    )


# ---------------------------------------------------------------------------
# Frame loading helper
# ---------------------------------------------------------------------------
async def _read(f: UploadFile):
    data = await f.read()
    if len(data) > MAX_UPLOAD:
        raise HTTPException(413, "file too large (max 200 MB)")
    try:
        return load_frame(data, f.filename or "")
    except ValueError as e:
        raise HTTPException(400, str(e))


def _size_warnings(a: np.ndarray) -> list:
    notices = []
    m = max(a.shape)
    if m > 512:
        notices.append(f"Frame is {a.shape[0]}×{a.shape[1]} px. Validated size is 512×512; larger inputs are experimental.")
    if m > 1024:
        raise HTTPException(400, f"Frame exceeds 1024 px cap (got {a.shape}). Crop it first.")
    return notices


# ---------------------------------------------------------------------------
# Legacy synchronous predict (keep working per hard rule)
# ---------------------------------------------------------------------------
@app.post("/api/predict")
async def predict(
    first: UploadFile = File(...),
    second: UploadFile = File(...),
    truth: UploadFile | None = File(None),
    gap_min: float = Form(20.0),
    method: str = Form("blend"),
):
    if method not in ("blend", "dis", "rife", "average"):
        raise HTTPException(422, "method must be blend, dis, rife or average")
    a, ia = await _read(first)
    b, ib = await _read(second)
    try:
        check_pair(a, b)
    except ValueError as e:
        raise HTTPException(400, str(e))

    notices = _size_warnings(a)
    mid, used = engine.predict(a, b, method)

    resp = dict(
        method_used=used,
        physical=bool(ia["physical"] and ib["physical"]),
        gap_min=gap_min,
        warning=WARNING,
        frames=dict(first=render.colour(a), middle=render.colour(mid), second=render.colour(b)),
    )
    if not resp["physical"]:
        notices.append("Image upload: values are not real brightness temperatures. Visual mode only; not validated.")
    if used != method and method in ("blend", "rife"):
        notices.append(f"RIFE unavailable ({engine.rife_error}); used DIS flow only.")
    if notices:
        resp["notice"] = " ".join(notices)
    if truth is not None and truth.filename:
        g, _ = await _read(truth)
        if g.shape != a.shape:
            raise HTTPException(400, "truth frame must have the same size")
        resp["metrics"] = evaluate(mid, g, a, b)
        resp["frames"]["truth"] = render.colour(g)
        resp["frames"]["difference"] = render.diff(mid, g)

    jid = uuid.uuid4().hex[:12]
    write_framefill_nc(
        OUT / f"{jid}.nc",
        [a, mid, b],
        [0, 1, 0],
        [0, gap_min / 2, gap_min],
        dict(method=used, source="user upload", gap_min=str(gap_min)),
    )
    resp["download"] = f"/api/download/{jid}"
    return resp


# ---------------------------------------------------------------------------
# Async job model
# ---------------------------------------------------------------------------
async def _run_job(jid: str, frames_data, gap_min: float, method: str, has_truth: bool):
    """Background coroutine that runs prediction and updates job state."""
    try:
        update_job(jid, status=RUNNING, progress=0.05, log="Loading frames…")
        job = get_job(jid)
        if job["status"] == CANCELLED:
            return

        a_bytes, a_name, b_bytes, b_name = frames_data[:4]
        a, ia = load_frame(a_bytes, a_name)
        b, ib = load_frame(b_bytes, b_name)
        check_pair(a, b)

        notices = []
        m = max(a.shape)
        if m > 512:
            notices.append(f"Frame is {a.shape[0]}×{a.shape[1]} px (>512, experimental).")

        update_job(jid, progress=0.2, log="Running interpolation…")
        job = get_job(jid)
        if job["status"] == CANCELLED:
            return

        mid, used = engine.predict(a, b, method)
        if used != method and method in ("blend", "rife"):
            notices.append("RIFE unavailable; used DIS only.")
        if not (ia["physical"] and ib["physical"]):
            notices.append("Image upload: visual mode only (not real K values).")

        update_job(jid, progress=0.6, log="Writing NetCDF…")

        nc_path = OUT / f"{jid}.nc"
        ftypes = [0, 1, 0]
        write_framefill_nc(nc_path, [a, mid, b], ftypes, [0, gap_min / 2, gap_min],
                           dict(method=used, source="user upload", gap_min=str(gap_min)))

        result = dict(
            method_used=used,
            physical=bool(ia["physical"] and ib["physical"]),
            gap_min=gap_min,
            warning=WARNING,
            notice=" ".join(notices) if notices else None,
            download=f"/api/download/{jid}",
            frames=dict(
                first=render.colour(a),
                middle=render.colour(mid),
                second=render.colour(b),
            ),
            frame_types=ftypes,
        )

        if has_truth and len(frames_data) >= 6:
            g_bytes, g_name = frames_data[4], frames_data[5]
            g, _ = load_frame(g_bytes, g_name)
            if g.shape == a.shape:
                result["metrics"] = evaluate(mid, g, a, b)
                result["frames"]["truth"] = render.colour(g)
                result["frames"]["difference"] = render.diff(mid, g)

        update_job(jid, status=DONE, progress=1.0, result=json.dumps(result), log="Done.")
    except asyncio.CancelledError:
        update_job(jid, status=CANCELLED, log="Cancelled.")
    except Exception as e:
        update_job(jid, status=FAILED, error=str(e), log=f"Error: {e}")
    finally:
        remove_task(jid)


@app.post("/api/jobs")
async def submit_job(
    background_tasks: BackgroundTasks,
    first: UploadFile = File(...),
    second: UploadFile = File(...),
    truth: UploadFile | None = File(None),
    gap_min: float = Form(20.0),
    method: str = Form("blend"),
):
    if method not in ("blend", "dis", "rife", "average"):
        raise HTTPException(422, "method must be blend, dis, rife or average")

    a_bytes = await first.read()
    b_bytes = await second.read()
    if len(a_bytes) > MAX_UPLOAD or len(b_bytes) > MAX_UPLOAD:
        raise HTTPException(413, "file too large")

    has_truth = truth is not None and truth.filename
    frames_data = [a_bytes, first.filename or "a.nc", b_bytes, second.filename or "b.nc"]
    if has_truth:
        t_bytes = await truth.read()
        frames_data += [t_bytes, truth.filename or "t.nc"]

    jid = create_job(method, gap_min)
    task = asyncio.create_task(_run_job(jid, frames_data, gap_min, method, bool(has_truth)))
    register_task(jid, task)

    return dict(job_id=jid, status=PENDING)


@app.get("/api/jobs")
def list_all_jobs(limit: int = 50):
    return list_jobs(limit)


@app.get("/api/jobs/{jid}")
def get_job_status(jid: str):
    if not jid.isalnum():
        raise HTTPException(400, "bad id")
    job = get_job(jid)
    if job is None:
        raise HTTPException(404, "job not found")
    return job


@app.delete("/api/jobs/{jid}")
def cancel_job_endpoint(jid: str):
    if not jid.isalnum():
        raise HTTPException(400, "bad id")
    # Try to cancel the asyncio task
    from .jobs import get_task
    task = get_task(jid)
    if task and not task.done():
        task.cancel()
    ok = cancel_job(jid)
    if not ok:
        raise HTTPException(400, "job cannot be cancelled (not running or already terminal)")
    return dict(cancelled=True, job_id=jid)


# ---------------------------------------------------------------------------
# Download
# ---------------------------------------------------------------------------
@app.get("/api/download/{jid}")
def download(jid: str):
    if not jid.isalnum():
        raise HTTPException(400, "bad id")
    p = OUT / f"{jid}.nc"
    if not p.exists():
        raise HTTPException(404, "not found")
    return FileResponse(p, filename=f"framefill_{jid}.nc", media_type="application/x-netcdf")


@app.get("/api/download/{jid}/gif")
def download_gif(jid: str):
    """Generate and return an animated GIF for a completed job."""
    if not jid.isalnum():
        raise HTTPException(400, "bad id")
    job = get_job(jid)
    if not job:
        raise HTTPException(404, "job not found")
    if job["status"] != DONE:
        raise HTTPException(400, "job not complete")
    nc = OUT / f"{jid}.nc"
    if not nc.exists():
        raise HTTPException(404, "nc file not found")
    try:
        ds = xr.open_dataset(nc, engine="h5netcdf")
        bt = ds.brightness_temperature.values  # (N, H, W)
        ft = list(ds.frame_type.values)
        ds.close()
        frames = [bt[i] for i in range(len(ft))]
        gif_bytes = make_gif(frames, ft)
        return Response(content=gif_bytes, media_type="image/gif",
                        headers={"Content-Disposition": f"attachment; filename=framefill_{jid}.gif"})
    except Exception as e:
        raise HTTPException(500, f"GIF generation failed: {e}")


@app.get("/api/download/{jid}/zip")
def download_zip(jid: str):
    """Generate and return a ZIP of PNGs for a completed job."""
    if not jid.isalnum():
        raise HTTPException(400, "bad id")
    job = get_job(jid)
    if not job:
        raise HTTPException(404, "job not found")
    if job["status"] != DONE:
        raise HTTPException(400, "job not complete")
    nc = OUT / f"{jid}.nc"
    if not nc.exists():
        raise HTTPException(404, "nc file not found")
    try:
        ds = xr.open_dataset(nc, engine="h5netcdf")
        bt = ds.brightness_temperature.values
        ft = list(ds.frame_type.values)
        ds.close()
        frames = [bt[i] for i in range(len(ft))]
        zip_bytes = make_png_zip(frames, ft, jid)
        return Response(content=zip_bytes, media_type="application/zip",
                        headers={"Content-Disposition": f"attachment; filename=framefill_{jid}_frames.zip"})
    except Exception as e:
        raise HTTPException(500, f"ZIP generation failed: {e}")


# ---------------------------------------------------------------------------
# Results (real CSVs only — hard rule 2)
# ---------------------------------------------------------------------------
def _nan_safe_records(df: pd.DataFrame) -> list:
    """Convert dataframe to records, replacing NaN with None for JSON safety."""
    return [
        {k: (None if (isinstance(v, float) and (v != v)) else v) for k, v in row.items()}
        for row in df.reset_index().rename(columns={"index": "engine"}).to_dict(orient="records")
    ]


@app.get("/api/results")
def get_results():
    """Read real result CSVs from results/ and return structured data."""
    if not RESULTS_DIR.exists():
        raise HTTPException(404, "results directory not found")

    summaries = {}
    for csv_path in sorted(RESULTS_DIR.glob("*.csv")):
        try:
            df = pd.read_csv(csv_path, index_col=0)
            # Drop fully-empty rows
            df = df.dropna(how="all")
            summaries[csv_path.stem] = {
                "columns": list(df.columns),
                "index": list(df.index.astype(str)),
                "data": _nan_safe_records(df),
            }
        except Exception as e:
            summaries[csv_path.stem] = {"error": str(e)}
    return summaries


@app.get("/api/results/{name}")
def get_result_file(name: str):
    """Return a single result CSV as JSON."""
    # Sanitise
    if not name.replace("_", "").replace("-", "").isalnum():
        raise HTTPException(400, "bad name")
    p = RESULTS_DIR / f"{name}.csv"
    if not p.exists():
        raise HTTPException(404, f"result file '{name}.csv' not found")
    df = pd.read_csv(p, index_col=0).dropna(how="all")
    return {
        "name": name,
        "columns": list(df.columns),
        "index": list(df.index.astype(str)),
        "data": _nan_safe_records(df),
    }


# ---------------------------------------------------------------------------
# Sequences (.nc files in results/)
# ---------------------------------------------------------------------------
@app.get("/api/sequences")
def list_sequences():
    """List available .nc sequence files."""
    if not RESULTS_DIR.exists():
        return []
    return [
        {"name": p.stem, "filename": p.name, "size": p.stat().st_size}
        for p in sorted(RESULTS_DIR.glob("*.nc"))
    ]


_seq_cache: dict[str, dict] = {}


def _get_cached_sequence(name: str) -> dict:
    """Load and cache an entire sequence in memory for instantaneous frame serving."""
    if not name.replace("_", "").replace("-", "").isalnum():
        raise HTTPException(400, "bad name")
    p = RESULTS_DIR / f"{name}.nc"
    if not p.exists():
        raise HTTPException(404, f"sequence '{name}' not found")

    mtime = p.stat().st_mtime
    cached = _seq_cache.get(name)
    if cached and cached.get("mtime") == mtime:
        return cached

    try:
        ds = xr.open_dataset(p, engine="h5netcdf")
        bt_all = ds.brightness_temperature.values
        ft = [int(x) for x in ds.frame_type.values]
        times = [str(t) for t in ds.time.values]
        ds.close()

        cached = {
            "mtime": mtime,
            "n_frames": len(times),
            "times": times,
            "frame_types": ft,
            "frames_bt": bt_all,
            "rendered_frames": {},
        }
        _seq_cache[name] = cached
        return cached
    except Exception as e:
        raise HTTPException(500, f"cannot read sequence: {e}")


@app.get("/api/sequences/{name}")
def get_sequence(name: str):
    """Return frame metadata for a .nc sequence (not frame bytes)."""
    cached = _get_cached_sequence(name)
    ft = cached["frame_types"]
    return {
        "name": name,
        "n_frames": int(cached["n_frames"]),
        "times": cached["times"],
        "frame_types": ft,
        "n_observed": int(sum(1 for x in ft if x == 0)),
        "n_synthetic": int(sum(1 for x in ft if x == 1)),
    }


@app.get("/api/sequences/{name}/frame/{idx}")
def get_sequence_frame(name: str, idx: int):
    """Return a single frame from a .nc sequence as a base64 PNG."""
    cached = _get_cached_sequence(name)
    n_frames = cached["n_frames"]
    if idx < 0 or idx >= n_frames:
        raise HTTPException(400, f"frame index {idx} out of range [0, {n_frames-1}]")

    rendered = cached["rendered_frames"].get(idx)
    if rendered is None:
        frame_data = cached["frames_bt"][idx]
        rendered = render.colour(frame_data)
        cached["rendered_frames"][idx] = rendered

    return {
        "idx": int(idx),
        "frame_type": int(cached["frame_types"][idx]),
        "image": rendered,
    }


# ---------------------------------------------------------------------------
# Real Example Triplet & Demo Result
# ---------------------------------------------------------------------------
EXAMPLES_DIR = Path(__file__).resolve().parent.parent / "examples" / "goes19_real_triplet"
_cached_demo = None

@app.get("/api/examples/triplet/file/{filename}")
def get_triplet_file(filename: str):
    """Serve real NOAA GOES-19 NetCDF files for the demo triplet."""
    allowed = ("t0_0000.nc", "truth_mid_0010.nc", "t20_0020.nc", "predicted_mid_0010.nc")
    if filename not in allowed:
        raise HTTPException(404, "file not found")
    p = EXAMPLES_DIR / filename
    if not p.exists():
        raise HTTPException(404, "file not found")
    return FileResponse(p, filename=filename, media_type="application/x-netcdf")


@app.get("/api/demo/prediction")
def get_demo_prediction():
    """Return precomputed prediction and real validation metrics for the GOES-19 sample triplet."""
    global _cached_demo
    if _cached_demo is not None:
        return _cached_demo

    try:
        a, _ = load_frame((EXAMPLES_DIR / "t0_0000.nc").read_bytes(), "t0_0000.nc")
        truth, _ = load_frame((EXAMPLES_DIR / "truth_mid_0010.nc").read_bytes(), "truth_mid_0010.nc")
        b, _ = load_frame((EXAMPLES_DIR / "t20_0020.nc").read_bytes(), "t20_0020.nc")
        mid, _ = load_frame((EXAMPLES_DIR / "predicted_mid_0010.nc").read_bytes(), "predicted_mid_0010.nc")
        metrics = evaluate(mid, truth, a, b)

        _cached_demo = {
            "method_used": "blend",
            "physical": True,
            "gap_min": 20.0,
            "warning": WARNING,
            "frames": {
                "first": render.colour(a),
                "middle": render.colour(mid),
                "second": render.colour(b),
                "truth": render.colour(truth),
                "difference": render.diff(mid, truth),
            },
            "metrics": metrics,
            "download": "/api/examples/triplet/file/predicted_mid_0010.nc",
            "notice": "Demonstration loaded: real NOAA GOES-19 ABI L2 CMIPF Ch13 512×512 physical validation triplet.",
        }
        return _cached_demo
    except Exception as e:
        raise HTTPException(500, f"cannot generate demo prediction: {e}")


@app.post("/api/insat/inspect")
async def inspect_insat_file(file: UploadFile = File(...)):
    """Inspect an uploaded INSAT .h5 or .nc file. Rejects invalid files. Never claims synthetic results."""
    ext = os.path.splitext(file.filename or "")[1].lower()
    if ext not in (".h5", ".hdf5", ".nc", ".nc4"):
        raise HTTPException(400, "Invalid file format: upload requires a valid HDF5 (.h5) or NetCDF (.nc) file.")

    data = await file.read()
    if len(data) > MAX_UPLOAD:
        raise HTTPException(413, "file too large")

    with tempfile.NamedTemporaryFile(suffix=ext, delete=False) as tmp:
        tmp.write(data)
        tmp_path = Path(tmp.name)

    try:
        import h5py
        with h5py.File(str(tmp_path), "r") as f:
            variables = {}
            def visit(name: str, obj):
                if hasattr(obj, "shape") and len(obj.shape) >= 2:
                    variables[name] = {
                        "shape": list(obj.shape),
                        "dtype": str(obj.dtype),
                    }
            f.visititems(visit)

        return {
            "filename": file.filename,
            "valid_hdf5": True,
            "variable_count": len(variables),
            "variables": list(variables.keys())[:20],
            "details": variables,
            "demonstrated": False,
            "message": (
                "File confirmed as valid HDF5/NetCDF container. "
                "However, INSAT-3DS temporal interpolation is NOT demonstrated. "
                "No ground truth data exists in this project to validate intermediate 15-minute frames. "
                "In accordance with project integrity rules, unvalidated predictions are not generated."
            ),
        }
    except Exception as e:
        raise HTTPException(400, f"Failed to parse file as HDF5/NetCDF: {e}")
    finally:
        if tmp_path.exists():
            os.unlink(tmp_path)


# ---------------------------------------------------------------------------
# Explainable AI Chat (OpenRouter Proxy)
# ---------------------------------------------------------------------------
@app.post("/api/ai/chat")
async def ai_chat_endpoint(body: dict):
    """Proxy to OpenRouter AI. API key stays strictly server-side."""
    from .ai_chat import chat as run_ai_chat

    messages = body.get("messages", [])
    context = body.get("context", {})
    if not messages:
        raise HTTPException(400, "messages list is required")

    reply = await run_ai_chat(messages, context)
    return {"reply": reply}


# ---------------------------------------------------------------------------
# Static files & Single-Page Application (SPA) routing
# ---------------------------------------------------------------------------
WEB = Path(__file__).resolve().parent.parent / "web" / "dist"
if not WEB.exists():
    WEB = Path(__file__).resolve().parent.parent / "web"

if (WEB / "assets").exists():
    app.mount("/assets", StaticFiles(directory=str(WEB / "assets")), name="assets")


SPA_ROUTES = {"", "predict", "viewer", "difference", "results", "sequence", "insat", "about"}

@app.get("/{full_path:path}")
def serve_spa(full_path: str):
    """Catch-all for SPA navigation and static assets."""
    if full_path.startswith("api/"):
        raise HTTPException(404, "API endpoint not found")
    file_candidate = WEB / full_path
    if full_path and file_candidate.is_file():
        return FileResponse(file_candidate)
    first_segment = full_path.strip("/").split("/")[0]
    if first_segment in SPA_ROUTES:
        index_file = WEB / "index.html"
        if index_file.exists():
            return FileResponse(index_file)
    raise HTTPException(404, "Not found")
