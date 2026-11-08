"""Read frames from .nc/.npy/.png/.jpg and write FrameFill-NC (observed/synthetic flagged)."""
import io
import os
import tempfile

import numpy as np
import xarray as xr
from PIL import Image

from .preprocess import HI, LO

WARNING = "Frames with frame_type=1 are SYNTHETIC model output, not observations. Do not use for retrievals."
KNOWN_VARS = ("CMI", "brightness_temperature", "IMG_TIR1_TEMP", "TIR1")


def load_frame(data, filename):
    """Return (array float32 in K, info dict). info['physical'] is False for images (visual mode)."""
    ext = os.path.splitext(filename.lower())[1]
    if ext in (".nc", ".nc4", ".h5", ".hdf5"):
        with tempfile.NamedTemporaryFile(suffix=ext, delete=False) as t:
            t.write(data)
            path = t.name
        try:
            ds = xr.open_dataset(path, engine="h5netcdf", mask_and_scale=True)
            name = next((v for v in KNOWN_VARS if v in ds.data_vars), None)
            if name is None:
                cand = [v for v in ds.data_vars if ds[v].ndim >= 2 and np.issubdtype(ds[v].dtype, np.number)]
                if not cand:
                    raise ValueError("no 2-D numeric variable found in the file")
                name = cand[0]
            da = ds[name]
            while da.ndim > 2:
                da = da.isel({da.dims[0]: 0})
            arr = da.values.astype("float32")
            ds.close()
        except ValueError:
            raise
        except Exception as e:
            raise ValueError(f"cannot read NetCDF/HDF5 file: {e}")
        finally:
            os.unlink(path)
        return arr, dict(physical=True, variable=name)
    if ext == ".npy":
        try:
            arr = np.load(io.BytesIO(data), allow_pickle=False).astype("float32")
        except Exception as e:
            raise ValueError(f"cannot read .npy: {e}")
        if arr.ndim != 2:
            raise ValueError(".npy must be a 2-D array of brightness temperature in K")
        return arr, dict(physical=True, variable="npy")
    if ext in (".png", ".jpg", ".jpeg"):
        try:
            im = np.asarray(Image.open(io.BytesIO(data)).convert("L"), dtype="float32") / 255.0
        except Exception as e:
            raise ValueError(f"cannot read image: {e}")
        return (im * (HI - LO) + LO).astype("float32"), dict(physical=False, variable="image")
    raise ValueError(f"unsupported file type '{ext}' (use .nc, .npy, .png or .jpg)")


def check_pair(a, b, max_side=1024):
    if a.shape != b.shape:
        raise ValueError(f"the two frames must have the same size, got {a.shape} and {b.shape}")
    if max(a.shape) > max_side:
        raise ValueError(f"frame larger than {max_side} px; crop it (validated at 512x512)")
    for n, x in (("first", a), ("second", b)):
        if np.isnan(x).mean() > 0.2:
            raise ValueError(f"{n} frame is more than 20% invalid")


def write_framefill_nc(path, frames, ftypes, times_min, attrs=None):
    """frames: list of 2-D K arrays; ftypes: 0 observed / 1 synthetic; times_min: minutes from the first frame."""
    t0 = np.datetime64("1970-01-01T00:00:00")
    secs = (np.array(times_min, dtype="float64") * 60).astype("timedelta64[s]")
    ds = xr.Dataset(
        {"brightness_temperature": (("time", "y", "x"), np.stack(frames).astype("float32"),
            {"units": "K", "long_name": "brightness temperature (observed or interpolated)", "standard_name": "toa_brightness_temperature"}),
         "frame_type": (("time",), np.array(ftypes, dtype="int8"),
            {"long_name": "0 = observed, 1 = SYNTHETIC interpolated", "flag_values": np.array([0, 1], dtype="int8"), "flag_meanings": "observed synthetic_interpolated"})},
        coords={"time": (t0 + secs).astype("datetime64[ns]")},
        attrs={"title": "FrameFill temporal interpolation", "warning": WARNING, "Conventions": "CF-1.8",
               "bt_range_k": f"{LO:.0f}-{HI:.0f}", **(attrs or {})})
    ds.to_netcdf(path, engine="h5netcdf", encoding={"brightness_temperature": {"zlib": True, "complevel": 4}})
