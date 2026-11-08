"""PNG rendering for the web UI. Fixed colour scale 180-330 K (bright = cold cloud); diff map +-10 K."""
import base64
import io

import numpy as np
from matplotlib import colormaps
from PIL import Image

from .preprocess import HI, LO


def _b64(rgb):
    b = io.BytesIO()
    Image.fromarray(rgb).save(b, "PNG")
    return "data:image/png;base64," + base64.b64encode(b.getvalue()).decode()


def colour(x):
    n = np.clip((np.nan_to_num(x, nan=LO) - LO) / (HI - LO), 0, 1)
    return _b64((colormaps["viridis"](1 - n)[..., :3] * 255).astype("uint8"))


def diff(p, g):
    d = np.clip(np.nan_to_num(p - g) / 20 + 0.5, 0, 1)
    return _b64((colormaps["PuOr_r"](d)[..., :3] * 255).astype("uint8"))
