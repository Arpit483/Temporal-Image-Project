"""Metrics in kelvin first. Valid = finite in prediction, truth and both inputs."""
import numpy as np
from scipy.ndimage import uniform_filter
from skimage.metrics import structural_similarity as ssim

from .preprocess import HI, LO

DYN_K, COLD_K = 3.0, 235.0


def _n(x):
    return np.clip((np.nan_to_num(x, nan=LO) - LO) / (HI - LO), 0, 1)


def evaluate(P, G, f0, f1):
    V = np.isfinite(P) & np.isfinite(G) & np.isfinite(f0) & np.isfinite(f1)
    D = V & (uniform_filter(np.nan_to_num(np.abs(f0 - f1)), 3) > DYN_K)
    C = V & (G < COLD_K)

    def mr(m):
        if m.sum() < 50:
            return np.nan, np.nan
        e = (P - G)[m]
        return float(np.abs(e).mean()), float(np.sqrt((e ** 2).mean()))

    mae, rmse = mr(V)
    mae_d, rmse_d = mr(D)
    _, rmse_c = mr(C)
    return dict(MAE_K=mae, RMSE_K=rmse, PSNR_dB=float(10 * np.log10(150 ** 2 / max(rmse ** 2, 1e-9))),
                SSIM=float(ssim(_n(P), _n(G), data_range=1.0, win_size=7)),
                MAE_dyn_K=mae_d, RMSE_dyn_K=rmse_d, RMSE_cold_K=rmse_c,
                bias_K=float((P - G)[V].mean()), dyn_fraction=float(D.mean()), cold_fraction=float(C.mean()))


def paired_bootstrap(diff, n=1000, seed=42):
    d = np.asarray(diff, dtype=float)
    d = d[np.isfinite(d)]
    rng = np.random.default_rng(seed)
    m = [rng.choice(d, len(d), replace=True).mean() for _ in range(n)]
    lo, hi = np.percentile(m, [2.5, 97.5])
    return float(d.mean()), float(lo), float(hi)
