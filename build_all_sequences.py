"""
Build pre-computed sequences for 4 storm events by DISCOVERING keys from S3
dynamically (avoids hardcoded creation-time suffix mismatches).

Storms:
  1. Hurricane Beryl Cat-5   (GOES-16, DOY 183/00-01, 2024)
  2. Super Typhoon Otis RI   (GOES-18, DOY 297/08-09, 2023)
  3. Midwest Derecho         (GOES-16, DOY 197/19-20, 2024)
  4. Pacific Atmospheric River (GOES-18, DOY 035/12-13, 2024)
"""
import os, sys, time, urllib.request, urllib.error, urllib.parse, xml.etree.ElementTree as ET
import xarray as xr, numpy as np
from pathlib import Path
from framefill.io_nc import write_framefill_nc
from framefill.engines import Interpolator

interp = Interpolator()
ROOT_DIR     = Path(__file__).resolve().parent
DOWNLOAD_DIR = ROOT_DIR / "storm_downloads"
RESULTS_DIR  = ROOT_DIR / "results"
DOWNLOAD_DIR.mkdir(exist_ok=True)
RESULTS_DIR.mkdir(exist_ok=True)

S3_NS = "http://s3.amazonaws.com/doc/2006-03-01/"


# ─────────────────────────────────────────────────────────────────────────────
# S3 key discovery: list a bucket/prefix and return all C13 full-disk keys
# sorted by scan start time.
# ─────────────────────────────────────────────────────────────────────────────
def list_c13_keys(bucket: str, prefix: str) -> list[str]:
    """Return sorted list of ABI C13 full-disk (CMIPF) keys under prefix."""
    url = (
        f"https://{bucket}.s3.amazonaws.com/"
        f"?list-type=2&prefix={urllib.parse.quote(prefix)}"
    )
    resp = urllib.request.urlopen(url, timeout=30)
    root = ET.fromstring(resp.read())
    keys = []
    for content in root.findall(f"{{{S3_NS}}}Contents"):
        key = content.find(f"{{{S3_NS}}}Key").text
        if "C13" in key and "CMIPF" in key:
            keys.append(key)
    return sorted(keys)


def discover_keys(bucket: str, hours: list[str]) -> list[str]:
    """
    Discover all C13 keys for the given list of hour-prefixes (e.g.
    ["ABI-L2-CMIPF/2024/183/00/", "ABI-L2-CMIPF/2024/183/01/"]).
    Returns the 7 evenly-spaced keys across the combined sorted list,
    falling back to however many are available (min 4).
    """
    all_keys = []
    for prefix in hours:
        all_keys.extend(list_c13_keys(bucket, prefix))
    all_keys = sorted(set(all_keys))
    print(f"  Discovered {len(all_keys)} C13 keys across {hours}")
    if len(all_keys) < 4:
        raise RuntimeError(f"Too few keys found: {len(all_keys)}")
    # Pick up to 7 evenly-spaced keys
    if len(all_keys) >= 7:
        # Prefer exact 10-minute spacing (indices 0,1,2,3,4,5, last)
        # Use the first 6 from hour-0 + last = first from hour-1
        picked = all_keys[:6] + [all_keys[-1]]
    else:
        picked = all_keys
    return picked


# ─────────────────────────────────────────────────────────────────────────────
# Storm definitions: each has bucket + hour-directory prefixes + crop centre
# ─────────────────────────────────────────────────────────────────────────────
STORMS = [
    {
        "name":   "hurricane_beryl_cat5",
        "label":  "Hurricane Beryl Cat-5 (Caribbean, July 2024)",
        "bucket": "noaa-goes16",
        "hours":  ["ABI-L2-CMIPF/2024/183/00/", "ABI-L2-CMIPF/2024/183/01/"],
        "eye_y":  1780, "eye_x": 2450,
    },
    {
        "name":   "typhoon_otis_rapid_intensification",
        "label":  "Super Typhoon Otis Rapid Intensification (E. Pacific, Oct 2023)",
        "bucket": "noaa-goes18",
        "hours":  ["ABI-L2-CMIPF/2023/297/08/", "ABI-L2-CMIPF/2023/297/09/"],
        "eye_y":  1900, "eye_x": 2950,
    },
    {
        "name":   "midwest_derecho_bow_echo",
        "label":  "Midwest Derecho / Bow Echo (USA, July 2024)",
        "bucket": "noaa-goes16",
        "hours":  ["ABI-L2-CMIPF/2024/197/19/", "ABI-L2-CMIPF/2024/197/20/"],
        "eye_y":  960,  "eye_x": 2340,
    },
    {
        "name":   "pacific_atmospheric_river",
        "label":  "Pacific Atmospheric River (California, Feb 2024)",
        "bucket": "noaa-goes18",
        "hours":  ["ABI-L2-CMIPF/2024/035/12/", "ABI-L2-CMIPF/2024/035/13/"],
        "eye_y":  1100, "eye_x": 2890,
    },
]


# ─────────────────────────────────────────────────────────────────────────────
def download_file(bucket: str, key: str, dest: Path) -> bool:
    """Download a single file. Returns True on success, False on 404."""
    url = f"https://{bucket}.s3.amazonaws.com/{key}"
    if dest.exists() and dest.stat().st_size > 1_000_000:
        print(f"  [cached] {dest.name}")
        return True
    print(f"  Downloading {dest.name} ... ", end="", flush=True)
    t0 = time.time()
    try:
        urllib.request.urlretrieve(url, dest)
        print(f"done in {time.time()-t0:.1f}s")
        return True
    except urllib.error.HTTPError as e:
        print(f"SKIPPED ({e})")
        if dest.exists():
            dest.unlink()
        return False


def build_storm(storm: dict):
    name   = storm["name"]
    bucket = storm["bucket"]
    cy, cx = storm["eye_y"], storm["eye_x"]

    out_nc = RESULTS_DIR / f"{name}.nc"
    if out_nc.exists():
        print(f"  [already built] {out_nc.name}")
        return

    print(f"\n{'='*60}")
    print(f"Building: {storm['label']}")
    print(f"{'='*60}")

    # 1. Discover keys dynamically
    print("  Listing S3 to discover keys ...")
    keys = discover_keys(bucket, storm["hours"])
    for k in keys:
        print(f"    {k.split('/')[-1]}")

    # 2. Download
    local_files = []
    for key in keys:
        fname = Path(key).name
        dest  = DOWNLOAD_DIR / fname
        ok = download_file(bucket, key, dest)
        if ok:
            local_files.append(dest)

    if len(local_files) < 4:
        print(f"  ERROR: only {len(local_files)} files downloaded — skipping storm")
        return

    # 3. Crop 512×512 centred on storm interest point
    print(f"  Cropping 512×512 @ (y={cy}, x={cx}) from {len(local_files)} frames ...")
    crops = []
    for fp in local_files:
        ds  = xr.open_dataset(fp, engine="h5netcdf", mask_and_scale=True)
        cmi = ds["CMI"].values[cy-256:cy+256, cx-256:cx+256].astype("float32")
        ds.close()
        if cmi.shape != (512, 512):
            print(f"    WARNING: {fp.name} crop={cmi.shape}, expected (512,512) — skip")
            continue
        cmi[np.isnan(cmi)] = np.nanmedian(cmi)
        print(f"    {fp.name}: min={np.nanmin(cmi):.1f}K  max={np.nanmax(cmi):.1f}K")
        crops.append(cmi)

    if len(crops) < 4:
        print(f"  ERROR: only {len(crops)} valid crops — skipping storm")
        return

    # 4. Synthesize interpolated frames between every pair of observed frames
    #    Pattern: obs, syn, obs, syn, obs, syn, obs  (up to 7 total)
    print(f"  Synthesizing {len(crops)-1} intermediate frames (50/50 blend) ...")
    frames, ftypes, times_min = [], [], []
    for i, obs in enumerate(crops):
        frames.append(obs)
        ftypes.append(0)                    # observed
        times_min.append(i * 20)            # 20-min observed cadence
        if i < len(crops) - 1:
            syn, _ = interp.predict(obs, crops[i+1], "blend")
            frames.append(syn)
            ftypes.append(1)                # synthetic
            times_min.append(i * 20 + 10)  # 10-min interpolated

    # 5. Write NetCDF
    write_framefill_nc(
        out_nc, frames, ftypes, times_min,
        attrs={"storm": storm["label"], "source_bucket": bucket}
    )
    print(f"  [OK] Written: {out_nc.name}  ({out_nc.stat().st_size // 1024} KB)")


# ─────────────────────────────────────────────────────────────────────────────
for storm in STORMS:
    try:
        build_storm(storm)
    except Exception as e:
        import traceback
        print(f"  ERROR building {storm['name']}: {e}")
        traceback.print_exc()

print("\n\nAll done! Sequences in results/:")
for f in sorted(RESULTS_DIR.glob("*.nc")):
    print(f"  {f.name}  ({f.stat().st_size // 1024} KB)")
