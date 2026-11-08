"""Tests for the async job model and new API endpoints."""
import io
import time

import numpy as np
import pytest
from fastapi.testclient import TestClient
from scipy.ndimage import gaussian_filter, shift


def scene(seed=0, n=128):
    rng = np.random.default_rng(seed)
    x = gaussian_filter(rng.standard_normal((n + 40, n + 40)), 6)
    x = (x - x.min()) / (x.max() - x.min())
    return (200 + 110 * x).astype("float32")


def shifted_triplet(dx=3.0):
    base = scene()
    f = lambda s: shift(base, (0, s), order=3, mode="nearest")[20:-20, 20:-20].astype("float32")
    return f(0), f(dx), f(2 * dx)


def npy_file(arr):
    b = io.BytesIO()
    np.save(b, arr)
    return ("f.npy", b.getvalue(), "application/octet-stream")


@pytest.fixture()
def client():
    from framefill import api
    return TestClient(api.app)


# --- Health ---
def test_health_endpoint(client):
    r = client.get("/api/health")
    assert r.status_code == 200
    j = r.json()
    assert j["status"] == "ok"
    assert "rife_available" in j
    assert "device" in j
    assert "version" in j


# --- Legacy /api/predict still works ---
def test_legacy_predict_still_works(client):
    f0, g, f1 = shifted_triplet()
    r = client.post(
        "/api/predict",
        files={"first": npy_file(f0), "second": npy_file(f1), "truth": npy_file(g)},
        data={"method": "dis"},
    )
    assert r.status_code == 200, r.text
    j = r.json()
    assert "SYNTHETIC" in j["warning"]
    assert j["metrics"]["MAE_K"] < 2.0


# --- Async job lifecycle ---
def test_job_submit_and_poll(client):
    f0, g, f1 = shifted_triplet()
    r = client.post(
        "/api/jobs",
        files={"first": npy_file(f0), "second": npy_file(f1)},
        data={"method": "dis", "gap_min": "20"},
    )
    assert r.status_code == 200, r.text
    jid = r.json()["job_id"]
    assert jid

    # Poll until done (or timeout)
    for _ in range(30):
        status_r = client.get(f"/api/jobs/{jid}")
        assert status_r.status_code == 200
        s = status_r.json()["status"]
        if s in ("done", "failed", "cancelled"):
            break
        time.sleep(0.5)

    final = client.get(f"/api/jobs/{jid}").json()
    assert final["status"] == "done", f"Job failed: {final.get('error')}"
    assert final["result"]["warning"]
    assert "SYNTHETIC" in final["result"]["warning"]


def test_job_list(client):
    r = client.get("/api/jobs")
    assert r.status_code == 200
    assert isinstance(r.json(), list)


def test_job_bad_id(client):
    r = client.get("/api/jobs/not-valid-id!!!")
    assert r.status_code == 400


def test_job_not_found(client):
    r = client.get("/api/jobs/aaaaaaaaaaaa")
    assert r.status_code == 404


# --- Results endpoints ---
def test_results_endpoint(client):
    r = client.get("/api/results")
    assert r.status_code == 200
    data = r.json()
    assert isinstance(data, dict)
    # Should have at least some CSV files loaded
    assert len(data) > 0


def test_results_specific_file(client):
    r = client.get("/api/results/dayA_baselines")
    assert r.status_code == 200
    j = r.json()
    assert "data" in j
    assert len(j["data"]) > 0


def test_results_bad_name(client):
    r = client.get("/api/results/../../etc/passwd")
    assert r.status_code in (400, 404)


# --- Sequences endpoint ---
def test_sequences_list(client):
    r = client.get("/api/sequences")
    assert r.status_code == 200
    assert isinstance(r.json(), list)


# --- Input validation ---
def test_predict_wrong_size(client):
    f0, _, f1 = shifted_triplet()
    small = f0[:64, :64]
    r = client.post(
        "/api/predict",
        files={"first": npy_file(f0), "second": npy_file(small)},
    )
    assert r.status_code == 400


def test_predict_too_many_nans(client):
    f0 = np.full((128, 128), np.nan, dtype="float32")
    f0[10:20, 10:20] = 250.0
    f1 = scene().astype("float32")
    r = client.post(
        "/api/predict",
        files={"first": npy_file(f0), "second": npy_file(f1)},
    )
    assert r.status_code == 400


def test_insat_inspect_invalid_format(client):
    r = client.post("/api/insat/inspect", files={"file": ("test.txt", b"plain text", "text/plain")})
    assert r.status_code == 400
    assert "Invalid file format" in r.text


def test_insat_inspect_valid_hdf5(client):
    import h5py
    bio = io.BytesIO()
    with h5py.File(bio, "w") as f:
        f.create_dataset("TIR1", data=np.zeros((10, 10), dtype="float32"))
    r = client.post("/api/insat/inspect", files={"file": ("insat_test.h5", bio.getvalue(), "application/x-hdf")})
    assert r.status_code == 200
    j = r.json()
    assert j["valid_hdf5"] is True
    assert j["demonstrated"] is False
    assert "NOT demonstrated" in j["message"]

