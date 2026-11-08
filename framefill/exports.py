"""Export helpers: PNG zip and GIF animation from job frames."""
import io
import zipfile

import numpy as np
from PIL import Image

from .preprocess import HI, LO


def _bt_to_pil(arr: np.ndarray, cmap: str = "viridis") -> Image.Image:
    """Convert BT array to PIL image with fixed 180-330 K scale."""
    from matplotlib import colormaps
    n = np.clip((np.nan_to_num(arr, nan=LO) - LO) / (HI - LO), 0, 1)
    rgb = (colormaps["viridis"](1 - n)[..., :3] * 255).astype("uint8")
    return Image.fromarray(rgb)


def make_png_zip(frames: list[np.ndarray], frame_types: list[int], job_id: str) -> bytes:
    """Return a zip archive of PNG frames labelled OBSERVED / SYNTHETIC."""
    buf = io.BytesIO()
    with zipfile.ZipFile(buf, "w", zipfile.ZIP_DEFLATED) as zf:
        for i, (arr, ft) in enumerate(zip(frames, frame_types)):
            label = "SYNTHETIC" if ft == 1 else "OBSERVED"
            name = f"frame_{i:04d}_{label}.png"
            img = _bt_to_pil(arr)
            # Stamp SYNTHETIC watermark
            if ft == 1:
                from PIL import ImageDraw
                draw = ImageDraw.Draw(img)
                w, h = img.size
                draw.text((4, 4), "SYNTHETIC", fill=(245, 182, 66))
            png_buf = io.BytesIO()
            img.save(png_buf, "PNG")
            zf.writestr(name, png_buf.getvalue())
        # Write a README
        zf.writestr(
            "README.txt",
            f"FrameFill export for job {job_id}\n"
            "Frames labelled SYNTHETIC are model output, not observations.\n"
            "Not for forecasting or retrievals.\n"
            "BT range: 180-330 K (bright = cold cloud).\n",
        )
    return buf.getvalue()


def make_gif(
    frames: list[np.ndarray],
    frame_types: list[int],
    duration_ms: int = 600,
    max_size: int = 512,
) -> bytes:
    """Return an animated GIF. SYNTHETIC frames get an amber border."""
    pil_frames = []
    for arr, ft in zip(frames, frame_types):
        img = _bt_to_pil(arr)
        # Resize if too large
        w, h = img.size
        if max(w, h) > max_size:
            scale = max_size / max(w, h)
            img = img.resize((int(w * scale), int(h * scale)), Image.LANCZOS)
        # Add SYNTHETIC border
        if ft == 1:
            from PIL import ImageDraw
            draw = ImageDraw.Draw(img)
            W, H = img.size
            for thickness in range(4):
                draw.rectangle(
                    [thickness, thickness, W - 1 - thickness, H - 1 - thickness],
                    outline=(245, 182, 66),
                )
            draw.text((4, 4), "SYNTHETIC", fill=(245, 182, 66))
        pil_frames.append(img.convert("P", palette=Image.ADAPTIVE, colors=256))

    if not pil_frames:
        raise ValueError("no frames to animate")

    buf = io.BytesIO()
    pil_frames[0].save(
        buf,
        format="GIF",
        save_all=True,
        append_images=pil_frames[1:],
        duration=duration_ms,
        loop=0,
    )
    return buf.getvalue()


def make_diff_image(pred: np.ndarray, truth: np.ndarray) -> bytes:
    """Return a PNG diff map (prediction minus truth), +-10 K, diverging."""
    from matplotlib import colormaps
    d = np.clip(np.nan_to_num(pred - truth) / 20 + 0.5, 0, 1)
    rgb = (colormaps["PuOr_r"](d)[..., :3] * 255).astype("uint8")
    buf = io.BytesIO()
    Image.fromarray(rgb).save(buf, "PNG")
    return buf.getvalue()
