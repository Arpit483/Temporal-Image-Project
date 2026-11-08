"""OpenRouter AI chat proxy — keeps the API key strictly server-side."""
import os

import httpx
from fastapi import HTTPException

OPENROUTER_API_KEY = os.environ.get("OPENROUTER_API_KEY", "")
OPENROUTER_URL = "https://openrouter.ai/api/v1/chat/completions"
MODEL = "nvidia/nemotron-3-ultra-550b-a55b:free"
FALLBACK_MODELS = [
    "nvidia/nemotron-3-super-120b-a12b:free",
    "openrouter/free",
]

SYSTEM_PROMPT = """\
You are FrameFill AI, an expert satellite meteorologist and machine learning specialist embedded in the FrameFill dashboard.
The dashboard displays geostationary thermal-infrared satellite imagery (GOES-19 ABI Channel 13), AI frame interpolations, and difference/error maps.

=== CRITICAL INSTRUCTION: USER ASKING ABOUT "THIS IMAGE" ===
The user is viewing the FrameFill dashboard screen right now. When the user asks:
- "What is this image about?"
- "What does this image show?"
- "What does it tell me?"
- "What is its significance?"
- Or any question referring to "this image", "the picture", "the scene", or "what am I looking at"

DO NOT SAY: "There is no image in this conversation", "I cannot see images", "I don't have access to images", or "describe the image to me".
The user is asking about the active satellite imagery, intermediate predictions, or difference maps currently displayed on the dashboard. You must immediately provide a structured, scientifically precise explanation:

1. **What the Image Depicts (Physical & Meteorological Scene):**
   - **Satellite & Sensor:** GOES-19 Advanced Baseline Imager (ABI) Channel 13 — the "clean" thermal-infrared window band (10.3 µm).
   - **What it Measures:** Day and night thermal radiation emitted by cloud tops and Earth's surface, calibrated directly to **brightness temperature (BT) in Kelvin (K)**.
   - **Geographic Region:** Equatorial / Tropical Americas (northwestern South America: Colombia, Ecuador, northern Peru, and Eastern Pacific Intertropical Convergence Zone / ITCZ, lat ~ -3.6° to +5.7°, lon ~ -80.7° to -71.4°).
   - **Meteorological Features:** Intense tropical deep convective storm complexes. The bright cores are high-altitude overshooting convective tops reaching freezing temperatures down to **188 K (-85 °C)**. Surrounding them are expanding cirrus anvil clouds (220–250 K), set against warm tropical ocean and rainforest canopy backgrounds (290–300 K / +17 to +27 °C).

2. **How to Read the Colors (Brightness Temperature Scale):**
   - **Bright yellow-green / cyan (180–235 K):** Very high, extremely cold convective storm tops and overshooting updrafts. Colder = higher altitude in the troposphere.
   - **Medium blues / teals (235–270 K):** Mid-to-high tropospheric stratiform clouds and expanding cirrus anvil outflow.
   - **Warm reds / oranges / purples / black (285–330 K):** Low warm clouds, clear ocean surface, or warm continental land/rainforest canopy.

3. **What It Tells Us & Scientific Significance:**
   - **Capturing Rapid Weather Evolution:** Convective storms can intensify, spawn severe weather, or collapse within 5 to 10 minutes. A native 20-minute satellite scan interval is too coarse to track rapid updrafts. Interpolating the missing t+10 minute intermediate frame doubles temporal resolution to 10 minutes, revealing smooth cloud advection and storm trajectory without needing to build and launch new satellites.
   - **Observed vs. Synthetic Frames:** OBSERVED frames are real satellite radiometer acquisitions. SYNTHETIC frames (tagged with the orange badge and NetCDF `frame_type=1`) are predicted by the **50/50 Blend engine** (DIS optical flow + RIFE v4.22 neural network).
   - **Difference Map Significance (if viewing difference/error):** A symmetric ±10 K diverging scale (pred − truth).
     * **Orange (Pred > Truth):** Highlights **new convective initiation**! Real storms grew rapidly within the 20-min window. Optical flow and RIFE can only advect existing pixels along motion vectors; they cannot spontaneously create new clouds out of clear air. Thus, positive residuals physically mark storm birth.
     * **Blue (Pred < Truth):** Cloud dissipation (evaporation) or over-advected cloud edges.
     * **White/Gray:** Accurate motion advection and stable background.

4. **Operational Caveat:**
   - Synthetic frames are interpolation estimates for visualization and cloud motion tracking. Under NOAA guidelines, synthetic frames (`frame_type=1`) must **NEVER** be used as raw inputs for quantitative geophysical soundings (e.g., quantitative precipitation estimation / rain rate or cloud optical depth).

Guidelines:
- Explain clearly and authoritatively with structured bullet points and bold highlights.
- When generating tables, use clean markdown table syntax with concise column headers so they render neatly in chat panels.
- Cite the exact page state, engine, frame number, and metrics provided in the context.
- If asked about non-satellite or non-meteorological topics (e.g. movies, pop culture, sports), politely decline and state your domain is the FrameFill satellite interpolation dashboard.
"""


def _build_context_block(context: dict) -> str:
    """Build a structured context block from the page state."""
    lines = ["=== Current Dashboard Context ==="]

    if page := context.get("page"):
        labels = {
            "predict": "Predict (frame upload & interpolation)",
            "viewer": "Synchronized Frame Viewer (animation/comparison)",
            "difference": "Difference Map & Error Analysis",
            "results": "Measured Experimental Results (CSV benchmarks)",
            "sequence": "Precomputed Sequence Playback (10-min cadence)",
            "insat": "INSAT-3DS Status (not demonstrated)",
            "about": "About FrameFill & Methodology",
        }
        lines.append(f"Page: {labels.get(page, page)}")

    # Scene & Visual Details
    region = context.get(
        "scene_region",
        "Equatorial South America & Tropical Pacific (ITCZ, Lat -3.6° to +5.7°, Lon -80.7° to -71.4°)",
    )
    lines.append(f"Scene Region: {region}")

    if img_desc := context.get("image_description"):
        lines.append(f"Active Image / Screen: {img_desc}")
    elif page == "sequence":
        lines.append(
            "Active Image / Screen: GOES-19 ABI Channel 13 IR sequence showing tropical deep convective storm evolution with 188 K cloud tops."
        )
    elif page == "difference":
        lines.append(
            "Active Image / Screen: Residual Error Map (Predicted - Truth) on ±10 K diverging scale. Orange = convective growth, Blue = cloud dissipation."
        )
    elif page == "viewer":
        lines.append(
            "Active Image / Screen: 3-frame sequence (t=0m observed, t=10m synthetic intermediate, t=20m observed) comparing cloud motion."
        )

    if feat := context.get("features_visible"):
        lines.append(f"Visible Features: {feat}")

    if method := context.get("method_used"):
        method_labels = {
            "blend": "50/50 Blend of DIS flow-warp + RIFE v4.22 (final recommended method)",
            "dis": "DIS Optical Flow only (classical OpenCV flow-warp)",
            "rife": "RIFE v4.22 only (neural flow, scale 2.0)",
            "average": "Linear Average (trivial 0.5·f0 + 0.5·f1 baseline)",
        }
        lines.append(f"Engine used: {method_labels.get(method, method)}")

    if (physical := context.get("physical")) is not None:
        lines.append(f"Data mode: {'Physical (real calibrated Kelvin values)' if physical else 'Visual mode only (PNG/image upload, not calibrated K)'}")

    if gap := context.get("gap_min"):
        lines.append(f"Time gap: {gap} min between frames (predicting t+{gap/2:.0f} min intermediate frame)")

    if m := context.get("metrics"):
        parts = []
        for key, label in [
            ("MAE_K", "MAE"), ("RMSE_K", "RMSE"), ("PSNR_dB", "PSNR"),
            ("SSIM", "SSIM"), ("MAE_dyn_K", "Dynamic-MAE"),
            ("RMSE_dyn_K", "Dynamic-RMSE (primary)"),
            ("RMSE_cold_K", "Cold-cloud RMSE"), ("bias_K", "Mean bias"),
        ]:
            if v := m.get(key):
                unit = "dB" if "dB" in key else ("" if key == "SSIM" else "K")
                parts.append(f"{label}={float(v):.3f}{unit}")
        if dyn := m.get("dyn_fraction"):
            parts.append(f"Dynamic-pixels={float(dyn)*100:.1f}%")
        if cold := m.get("cold_fraction"):
            parts.append(f"Cold-cloud-pixels={float(cold)*100:.1f}%")
        if parts:
            lines.append("Validation metrics: " + "  ".join(parts))

    if fi := context.get("frame_info"):
        lines.append(f"Frame context: {fi}")

    if sn := context.get("sequence_name"):
        n_obs = context.get("n_observed", "?")
        n_syn = context.get("n_synthetic", "?")
        lines.append(f"Sequence: '{sn}' — {n_obs} observed + {n_syn} synthetic frames (10-min interpolated cadence)")

    if seq_frame := context.get("current_frame_idx"):
        ft = context.get("current_frame_type", 0)
        ft_label = "SYNTHETIC (model prediction, frame_type=1)" if ft == 1 else "OBSERVED (real satellite, frame_type=0)"
        lines.append(f"Current frame: #{seq_frame} — {ft_label}")

    if result_tab := context.get("results_tab"):
        tab_labels = {
            "20to10": "20→10 min hold-out benchmark (primary validation)",
            "60to30": "60→30 min cadence stress test",
            "scales": "RIFE flow-scale ablation study",
        }
        lines.append(f"Results tab: {tab_labels.get(result_tab, result_tab)}")

    if notice := context.get("notice"):
        lines.append(f"Note: {notice}")

    lines.append("=== End Context ===")
    return "\n".join(lines)


async def chat(messages: list[dict], context: dict) -> str:
    """Send messages to OpenRouter and return the AI reply text."""
    api_key = os.environ.get("OPENROUTER_API_KEY") or OPENROUTER_API_KEY
    if not api_key:
        raise HTTPException(
            503,
            "AI chat is not configured: OPENROUTER_API_KEY env var is missing."
        )

    context_block = _build_context_block(context)
    full_system = SYSTEM_PROMPT + "\n\n" + context_block

    full_messages = [
        {"role": "system", "content": full_system},
        *messages[-10:],  # Keep last 10 turns to manage context
    ]

    candidate_models = [MODEL, *FALLBACK_MODELS]
    last_err = None

    async with httpx.AsyncClient(timeout=45.0) as client:
        for m in candidate_models:
            payload = {
                "model": m,
                "messages": full_messages,
                "max_tokens": 1200,
                "temperature": 0.4,
            }
            try:
                resp = await client.post(
                    OPENROUTER_URL,
                    headers={
                        "Authorization": f"Bearer {api_key}",
                        "Content-Type": "application/json",
                        "HTTP-Referer": "http://localhost:8000",
                        "X-Title": "FrameFill Dashboard",
                    },
                    json=payload,
                )
            except httpx.RequestError as exc:
                last_err = f"Network connection failed: {exc}"
                continue

            if resp.status_code == 429:
                last_err = "AI is temporarily rate-limited upstream."
                continue
            if resp.status_code == 503:
                last_err = "AI backend is temporarily overloaded."
                continue
            if not resp.is_success:
                last_err = f"AI service returned HTTP {resp.status_code}."
                continue

            data = resp.json()
            if "error" in data:
                err_msg = data["error"].get("message", "unknown error")
                last_err = f"AI provider error: {err_msg}"
                continue

            choices = data.get("choices", [])
            if choices and choices[0].get("message", {}).get("content"):
                return choices[0]["message"]["content"]

    raise HTTPException(
        502,
        f"AI service temporarily unavailable ({last_err or 'all free endpoints busy'}). Please try again in a few seconds."
    )
