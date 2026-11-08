"""Optional INSAT .h5 loader stub — enabled only when FRAMEFILL_INSAT_ENABLE=1.
This is a STUB: it reads variable names from the file but does NOT claim any validated INSAT results.
No INSAT ground truth exists in this project. See the /insat page in the dashboard for honest status.
"""
import os
import warnings
from pathlib import Path
from typing import Any

ENABLED = os.environ.get("FRAMEFILL_INSAT_ENABLE", "0") == "1"


def discover_insat_variables(path: str | Path) -> dict[str, Any]:
    """
    Discover variable names and structure in an INSAT HDF5 file.
    Returns variable names, shapes, and units where available.
    Does NOT load pixel data. Does NOT claim any validated results.

    This function is a stub for future INSAT-3DS support.
    Requires: h5py, FRAMEFILL_INSAT_ENABLE=1
    """
    if not ENABLED:
        raise RuntimeError(
            "INSAT loader is disabled. Set FRAMEFILL_INSAT_ENABLE=1 to enable the stub. "
            "No INSAT-3DS results have been validated in this project."
        )

    try:
        import h5py
    except ImportError:
        raise ImportError("h5py is required for INSAT file inspection. Install it with: pip install h5py")

    path = Path(path)
    if not path.exists():
        raise FileNotFoundError(f"File not found: {path}")
    if path.suffix not in (".h5", ".hdf5", ".nc"):
        raise ValueError(f"Expected .h5/.hdf5/.nc file, got: {path.suffix}")

    variables = {}
    with h5py.File(str(path), "r") as f:
        def visit(name: str, obj) -> None:
            if hasattr(obj, "shape") and len(obj.shape) >= 2:
                variables[name] = {
                    "shape": list(obj.shape),
                    "dtype": str(obj.dtype),
                    "units": obj.attrs.get("units", "unknown"),
                    "long_name": obj.attrs.get("long_name", ""),
                }
        f.visititems(visit)
        global_attrs = dict(f.attrs)

    warnings.warn(
        "INSAT loader stub: No INSAT-3DS results are validated in this project. "
        "This function only reads file structure for future development.",
        UserWarning,
        stacklevel=2,
    )

    return {
        "file": str(path),
        "variables": variables,
        "global_attrs": {k: str(v) for k, v in global_attrs.items()},
        "warning": (
            "INSAT-3DS data has NOT been validated in FrameFill. "
            "No results have been demonstrated on INSAT data. "
            "This stub discovers variable names only."
        ),
    }


def load_insat_tir1(path: str | Path, variable_name: str | None = None) -> None:
    """
    STUB: Future loader for INSAT-3DS TIR1 brightness temperature.
    Not implemented — no INSAT data has been obtained for this project.

    To use this stub:
    1. Obtain INSAT-3DS HDF5 data from MOSDAC (mosdac.gov.in)
    2. Call discover_insat_variables() to find the TIR1 variable name
    3. Implement the count-to-temperature conversion for your data version
    4. This project does NOT have such data; no results have been validated
    """
    raise NotImplementedError(
        "INSAT-3DS loader is not implemented. No INSAT data has been obtained or validated in this project. "
        "See README section 'What is NOT done / limits' for details."
    )
