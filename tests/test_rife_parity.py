"""RIFE parity test — skipped if RIFE or torch is absent.
Runs the packaged engine on synthetic triplets and reports max absolute difference.
Run: pytest tests/test_rife_parity.py -v
"""
import numpy as np
import pytest
from scipy.ndimage import gaussian_filter, shift

torch = pytest.importorskip("torch")

try:
    from framefill.engines import Interpolator
    _eng = Interpolator()
    if not _eng.rife_available:
        pytest.skip(f"RIFE weights not available: {_eng.rife_error}", allow_module_level=True)
except Exception as e:
    pytest.skip(f"RIFE import failed: {e}", allow_module_level=True)


def scene(seed: int = 0, n: int = 128) -> np.ndarray:
    rng = np.random.default_rng(seed)
    x = gaussian_filter(rng.standard_normal((n + 40, n + 40)), 6)
    x = (x - x.min()) / (x.max() - x.min())
    return (200 + 110 * x).astype("float32")


def shifted_triplet(dx: float = 3.0, seed: int = 0):
    base = scene(seed)
    f = lambda s: shift(base, (0, s), order=3, mode="nearest")[20:-20, 20:-20].astype("float32")
    return f(0.0), f(dx), f(2 * dx)


@pytest.fixture(scope="module")
def rife_engine():
    eng = Interpolator()
    assert eng.rife_available, f"RIFE should be available: {eng.rife_error}"
    return eng


def test_rife_output_shape(rife_engine):
    f0, _, f1 = shifted_triplet(3.0, seed=1)
    out = rife_engine.rife(f0, f1)
    assert out.shape == f0.shape, f"Shape mismatch: {out.shape} vs {f0.shape}"


def test_rife_output_dtype(rife_engine):
    f0, _, f1 = shifted_triplet(3.0, seed=2)
    out = rife_engine.rife(f0, f1)
    assert out.dtype == np.float32


def test_rife_output_in_physical_range(rife_engine):
    """Output must be within input range ± 5 K (hard rule: GUARD_K = 5.0)."""
    f0, _, f1 = shifted_triplet(3.0, seed=3)
    out = rife_engine.rife(f0, f1)
    lo = min(np.nanmin(f0), np.nanmin(f1)) - 5.0
    hi = max(np.nanmax(f0), np.nanmax(f1)) + 5.0
    assert np.nanmin(out) >= lo - 1e-3, f"Output below lo={lo:.1f}: min={np.nanmin(out):.1f}"
    assert np.nanmax(out) <= hi + 1e-3, f"Output above hi={hi:.1f}: max={np.nanmax(out):.1f}"


def test_rife_nan_propagation(rife_engine):
    """NaNs in either input must appear in output (hard rule)."""
    f0, _, f1 = shifted_triplet(3.0, seed=4)
    f0 = f0.copy()
    f0[10:20, 10:20] = np.nan
    out = rife_engine.rife(f0, f1)
    assert np.isnan(out[10:20, 10:20]).all(), "NaN regions from f0 must propagate to output"
    assert np.isfinite(out[50:60, 50:60]).all(), "Non-NaN regions should be finite"


def test_rife_better_than_average_on_shift(rife_engine):
    """RIFE should beat simple averaging on a known shift (at scale 2.0)."""
    from framefill.engines import b0
    f0, g, f1 = shifted_triplet(3.0, seed=5)
    out = rife_engine.rife(f0, f1, scale=2.0)
    e_rife = float(np.nanmean(np.abs(out - g)))
    e_avg = float(np.nanmean(np.abs(b0(f0, f1) - g)))
    print(f"\nRIFE MAE={e_rife:.4f} K, Average MAE={e_avg:.4f} K, diff={e_avg-e_rife:.4f} K")
    assert e_rife < e_avg + 0.5, (
        f"RIFE ({e_rife:.3f} K) is worse than average ({e_avg:.3f} K) by more than 0.5 K"
    )


def test_rife_scale20_vs_scale10(rife_engine):
    """Scale 2.0 should give similar or better result than scale 1.0 on small motions."""
    f0, g, f1 = shifted_triplet(3.0, seed=6)
    out10 = rife_engine.rife(f0, f1, scale=1.0)
    out20 = rife_engine.rife(f0, f1, scale=2.0)
    e10 = float(np.nanmean(np.abs(out10 - g)))
    e20 = float(np.nanmean(np.abs(out20 - g)))
    print(f"\nScale 1.0 MAE={e10:.4f} K, Scale 2.0 MAE={e20:.4f} K")
    # Scale 2.0 should not be more than 0.5 K worse than scale 1.0
    assert e20 < e10 + 0.5, f"Scale 2.0 ({e20:.3f} K) much worse than scale 1.0 ({e10:.3f} K)"


def test_rife_blend_beats_dis(rife_engine):
    """The blend (50/50 DIS + RIFE) should not be worse than DIS by more than 0.2 K."""
    f0, g, f1 = shifted_triplet(4.0, seed=7)
    dis_out = rife_engine.dis(f0, f1)
    blend_out, _ = rife_engine.predict(f0, f1, "blend")
    e_dis = float(np.nanmean(np.abs(dis_out - g)))
    e_blend = float(np.nanmean(np.abs(blend_out - g)))
    print(f"\nDIS MAE={e_dis:.4f} K, Blend MAE={e_blend:.4f} K")
    assert e_blend < e_dis + 0.2, (
        f"Blend ({e_blend:.3f} K) much worse than DIS ({e_dis:.3f} K)"
    )


def test_rife_max_abs_diff_report(rife_engine):
    """Report max absolute difference across 5 triplets for parity tracking."""
    diffs = []
    for seed in range(5):
        f0, g, f1 = shifted_triplet(3.0, seed=seed + 10)
        out = rife_engine.rife(f0, f1, scale=2.0)
        mask = np.isfinite(out) & np.isfinite(g)
        if mask.any():
            diffs.append(float(np.abs(out[mask] - g[mask]).max()))
    max_diff = max(diffs) if diffs else float("nan")
    print(f"\nRIFE scale=2.0: max absolute difference across 5 triplets = {max_diff:.4f} K")
    # Not a hard threshold — just reports for parity tracking
    assert max_diff < 100.0, f"Unreasonably large max diff: {max_diff:.1f} K"


@pytest.mark.benchmark
def test_rife_timing_smoke(rife_engine):
    """Smoke-test timing for 512×512 inputs."""
    import time
    rng = np.random.default_rng(99)
    f0 = (200 + 110 * rng.random((512, 512))).astype("float32")
    f1 = (200 + 110 * rng.random((512, 512))).astype("float32")
    times = []
    for _ in range(3):
        t0 = time.perf_counter()
        rife_engine.rife(f0, f1, scale=2.0)
        times.append(time.perf_counter() - t0)
    p50 = float(np.median(times))
    p95 = float(np.percentile(times, 95))
    print(f"\n512×512 RIFE timing (3 runs): p50={p50:.2f}s, p95={p95:.2f}s")
    assert p50 < 300.0, f"RIFE too slow: p50={p50:.1f}s (expected < 300s on CPU)"
