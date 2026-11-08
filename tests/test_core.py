import io

import numpy as np
import pytest
import xarray as xr
from fastapi.testclient import TestClient
from scipy.ndimage import gaussian_filter, shift

from framefill.engines import Interpolator, b0
from framefill.io_nc import WARNING, load_frame, write_framefill_nc
from framefill.metrics import evaluate, paired_bootstrap
from framefill.preprocess import denormalise, normalise


def scene(seed=0, n=128):
    rng = np.random.default_rng(seed)
    x = gaussian_filter(rng.standard_normal((n + 40, n + 40)), 6)
    x = (x - x.min()) / (x.max() - x.min())
    return (200 + 110 * x).astype("float32")


def shifted_triplet(dx=3.0):
    base = scene()
    f = lambda s: shift(base, (0, s), order=3, mode="nearest")[20:-20, 20:-20].astype("float32")
    return f(0), f(dx), f(2 * dx)  # first, true middle, second


def test_normalisation_roundtrip():
    x = np.linspace(190, 320, 100).astype("float32")
    assert np.abs(denormalise(normalise(x)) - x).max() < 1e-3


def test_flow_beats_average_on_known_shift():
    f0, g, f1 = shifted_triplet(3.0)
    eng = Interpolator()
    e_dis = np.abs(eng.dis(f0, f1) - g).mean()
    e_avg = np.abs(b0(f0, f1) - g).mean()
    assert e_dis < e_avg and e_dis < 1.5


def test_nan_propagates():
    f0, g, f1 = shifted_triplet()
    f0 = f0.copy(); f0[10:20, 10:20] = np.nan
    out = Interpolator().dis(f0, f1)
    assert np.isnan(out[10:20, 10:20]).all() and np.isfinite(out[50:60, 50:60]).all()


def test_metrics_perfect_and_bias():
    f0, g, f1 = shifted_triplet()
    m = evaluate(g, g, f0, f1)
    assert m["MAE_K"] == 0 and m["SSIM"] > 0.999
    assert abs(evaluate(g + 2, g, f0, f1)["bias_K"] - 2) < 1e-4


def test_bootstrap_ci_contains_mean():
    mu, lo, hi = paired_bootstrap(np.random.default_rng(1).normal(-0.5, 0.2, 200))
    assert lo < mu < hi and hi < 0


def test_nc_roundtrip_and_flags(tmp_path):
    f0, g, f1 = shifted_triplet()
    p = tmp_path / "o.nc"
    write_framefill_nc(p, [f0, g, f1], [0, 1, 0], [0, 10, 20])
    ds = xr.open_dataset(p, engine="h5netcdf")
    assert ds.attrs["warning"] == WARNING
    assert list(ds.frame_type.values) == [0, 1, 0]
    assert np.allclose(ds.brightness_temperature.values[0], f0)
    assert np.diff(ds.time.values).astype("timedelta64[m]").astype(int).tolist() == [10, 10]


def test_loader_rejects_bad_files():
    with pytest.raises(ValueError):
        load_frame(b"hello", "x.txt")
    with pytest.raises(ValueError):
        load_frame(b"not a netcdf", "x.nc")


def test_api_smoke_and_errors():
    from framefill import api
    c = TestClient(api.app)
    f0, g, f1 = shifted_triplet()
    npy = lambda a: ("f.npy", (lambda b: (np.save(b, a), b.getvalue())[1])(io.BytesIO()), "application/octet-stream")
    r = c.post("/api/predict", files={"first": npy(f0), "second": npy(f1), "truth": npy(g)}, data={"method": "dis"})
    assert r.status_code == 200, r.text
    j = r.json()
    assert j["metrics"]["MAE_K"] < 1.5 and j["physical"] is True and "SYNTHETIC" in j["warning"]
    assert c.get(j["download"]).status_code == 200
    bad = c.post("/api/predict", files={"first": npy(f0), "second": npy(f1[:60])})
    assert bad.status_code == 400
    assert c.post("/api/predict", files={"first": ("a.txt", b"x"), "second": ("b.txt", b"x")}).status_code == 400
    assert c.get("/api/health").json()["status"] == "ok"
