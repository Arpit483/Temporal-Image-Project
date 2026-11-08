"""Fixed-range brightness-temperature (BT) helpers. Never use per-image min-max."""
import numpy as np

LO, HI = 180.0, 330.0  # K, frozen for every experiment


def fill(x: np.ndarray) -> np.ndarray:
    """Replace NaN with the frame mean (used ONLY as network/flow input; re-mask on output)."""
    return np.where(np.isnan(x), np.nanmean(x), x).astype("float32")


def normalise(x: np.ndarray, lo: float = LO, hi: float = HI) -> np.ndarray:
    return np.clip((x - lo) / (hi - lo), 0, 1).astype("float32")


def denormalise(y: np.ndarray, lo: float = LO, hi: float = HI) -> np.ndarray:
    return (y * (hi - lo) + lo).astype("float32")


def to8(x: np.ndarray) -> np.ndarray:
    """8-bit copy for DIS optical flow ONLY (warping stays on float32 BT)."""
    return (normalise(fill(x)) * 255).astype("uint8")
