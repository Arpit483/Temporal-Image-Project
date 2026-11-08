# FrameFill — Project Log (what we did, why, and every detail)

**Project:** AI temporal interpolation of geostationary thermal-IR satellite imagery (ISRO × Hack2skill Bharatiya Antariksh Hackathon 2026, Problem Statement 12)
**Log date:** 25 October 2026
**Status:** Research prototype. Everything below was run on Kaggle (GPU, Python 3.13, torch 2.11 + CUDA). Numbers are measured results from our own runs unless marked otherwise.

---

## 1. The problem and the goal

Geostationary satellites deliver images at a fixed cadence (INSAT ≈ 30 min, GOES/Himawari ≈ 10 min). Fast weather (storms, cyclones) changes between frames. The task is to **synthesise an intermediate frame between two observed frames** using optical-flow-based AI/ML, validate it against real data, and eventually apply it to INSAT-3DS to get 15-minute imagery.

**Our core question:** *Can an AI frame interpolator (RIFE) fill in a missing thermal-IR satellite frame better than simple methods, when measured against the real frame in kelvin?*

---

## 2. Data

| Item | Detail |
|---|---|
| Satellite / product | GOES-19 ABI **L2 CMIPF, Channel 13** (clean IR window, ≈ 10.3 µm), brightness temperature in K |
| Source | NOAA public AWS bucket `noaa-goes19/ABI-L2-CMIPF/`, anonymous access via `s3fs` |
| Variable | `CMI` (decoded with `xarray`, `mask_and_scale=True`, engine `h5netcdf`) |
| Cadence | 10 min, 144 files per day |
| **Day A** | day-of-year 295 → **22 Oct 2026**, 144 frames |
| **Day B** | day-of-year 292 → **19 Oct 2026**, 144 frames |
| Crop (ROI) | pixels `y = 2400:2912`, `x = 2400:2912` → **512 × 512** per frame, float32 |
| BT range seen | Day A 187.6–316.1 K; Day B 185.5–316.8 K |
| Saved as | `crops_dayA.npz`, `crops_dayB.npz` (arrays `frames`, `times`) |

**Triplets.** A triplet is (frame at t, hidden middle frame at t+10 min, frame at t+20 min). A triplet is kept only if its two outer frames are exactly 20 min apart and none of its three frames is more than 20% NaN. Result: **142 triplets for Day A and 142 for Day B** (saved as `triplets_A.npy`, `triplets_B.npy`).

**Why GOES-19 and not INSAT first:** GOES-19 is openly downloadable and has 10-minute cadence, so a *real* observed frame exists at the middle time to serve as ground truth (the PS itself suggests this protocol). INSAT needs an approved MOSDAC account and has only 30-min cadence.

**Not done / not used:** INSAT-3DS/3DR data (none obtained yet), Himawari, any CONUS 5-minute data, any third day.

---

## 3. Evaluation design (why it is set up this way)

- **Hold-out protocol (P1 in the SDLC package):** give each method the frames at t and t+20 min, ask for t+10 min, compare with the real observed frame.
- **Physical units first:** errors are in kelvin. Image-similarity scores are secondary.
- **Fixed normalisation:** BT is mapped with `x = clip((BT − 180) / (330 − 180), 0, 1)` for every frame. No per-image min-max (except in the deliberate "naive" negative control).
- **Invalid pixels:** NaNs are filled with the frame mean *only* as network input; output pixels that are NaN in either input frame are set back to NaN. Metrics use only pixels valid in prediction, truth and both inputs.
- **Dynamic-pixel subset:** pixels where the 3×3-smoothed `|f0 − f1| > 3 K`. This avoids rewarding methods for static background. Dynamic fraction was 0.56 (Day A) and 0.474 (Day B).

**Metrics computed:** MAE, RMSE, PSNR (fixed data range 150 K), SSIM (normalised image, window 7), MAE/RMSE on dynamic pixels, dynamic fraction. Later: gradient correlation, gradient-magnitude ratio, high-frequency power ratio, bias.

**Statistics:** paired bootstrap over triplets (1,000 resamples, seed 42) on the per-triplet dynamic-pixel RMSE difference between two methods, reported as mean difference with 95% CI.

**Not computed:** FSIM, cold-cloud (< 235 K) subset, error-vs-time-of-day, cycle-consistency, flicker.

---

## 4. Methods compared

| ID | Method | How it works |
|---|---|---|
| **B0** | Linear blend | `0.5·f0 + 0.5·f1`. Trivial baseline. |
| **B1** | Classical optical flow + warp | OpenCV **DIS** (`PRESET_MEDIUM`). Flow computed on 8-bit scaled copies *only*; both frames are then backward-warped by half the flow on **float32 BT** and averaged. Forward and backward flow both used. |
| **B2** | Pretrained RIFE, "naive" | RIFE with per-image min-max normalisation. Negative control. |
| **B3** | Pretrained RIFE, "fixed range" | RIFE with the fixed 180–330 K normalisation. |
| **B5 (blend)** | 0.5·B1 + 0.5·B3 (scale 2.0) | Post-hoc ensemble. See caveat in §8. |

**RIFE details**
- Model: **Practical-RIFE, weights v4.22** (`RIFE_HDv3.Model`, `flownet.pkl`). Pretrained on RGB video; **no fine-tuning was done**.
- Input: the single BT channel is replicated to 3 channels; output channels are averaged back to one.
- Padding: replicate-pad to a multiple of `max(128, 128/scale)` (RIFE needs this), cropped back afterwards.
- Output decoded back to kelvin and clipped to `[min(inputs) − 5 K, max(inputs) + 5 K]`.
- Timestep 0.5 (middle frame). The `scale` argument controls the resolution at which RIFE estimates flow.

---

## 5. Results (all measured)

### 5.1 Day A baselines and RIFE (142 triplets)

| Engine | MAE (K) | RMSE (K) | PSNR (dB) | SSIM | MAE dyn | RMSE dyn |
|---|---|---|---|---|---|---|
| B0 blend | 2.085 | 3.314 | 33.318 | 0.867 | 2.965 | 4.193 |
| B1 DIS flow | 1.310 | 2.042 | 37.383 | 0.944 | 1.746 | 2.500 |
| B2 RIFE naive (scale 1) | 1.347 | 2.110 | 37.093 | 0.942 | 1.793 | 2.585 |
| B3 RIFE fixed (scale 1) | 1.338 | 2.096 | 37.150 | 0.942 | 1.782 | 2.567 |

### 5.2 Paired bootstrap on Day A (dynamic-pixel RMSE)

| Comparison | Mean diff | 95% CI |
|---|---|---|
| B3 − B1 | +0.067 K | [+0.062, +0.072] |
| B2 − B3 | +0.018 K | [+0.016, +0.021] |
| B0 − B1 | +1.694 K | [+1.573, +1.814] |

Reading: flow methods are far better than blending; at the default RIFE scale, classical flow was slightly better than RIFE; fixed-range normalisation helped RIFE by a very small but consistent amount.

### 5.3 Day B (second day, same ROI), scale 1.0

| Engine | MAE | RMSE | PSNR | SSIM | MAE dyn | RMSE dyn |
|---|---|---|---|---|---|---|
| B0 | 1.708 | 2.913 | 34.472 | 0.906 | 2.753 | 4.033 |
| B1 | 1.213 | 2.005 | 37.713 | 0.951 | 1.842 | 2.693 |
| B2 naive | 1.241 | 2.052 | 37.513 | 0.949 | 1.873 | 2.748 |
| B3 fixed | 1.237 | 2.044 | 37.546 | 0.949 | 1.867 | 2.736 |

Bootstrap (dyn RMSE): B3 − B1 = +0.044 K [+0.036, +0.051]; B0 − B1 = +1.340 K [+1.306, +1.378]; B2 − B3 = +0.011 K [+0.009, +0.014]. The Day A ranking held on Day B.

### 5.4 RIFE ablations (Day A)

| Variant | MAE dyn | RMSE dyn | Verdict |
|---|---|---|---|
| B3 scale 1.0 | 1.782 | 2.567 | reference |
| B3 **scale 0.5** | 2.010 | 2.872 | **worse** (+0.306 K, CI [+0.297, +0.314]) |
| B3 **polarity inverted** (cold = bright) | 1.783 | 2.569 | no effect (+0.002 K, CI [−0.000, +0.005]) |

Error by motion tercile (Day A, dyn RMSE): slow / medium / fast — B1 2.309 / 2.396 / 2.798; B3 2.376 / 2.476 / 2.852; B3 scale 0.5 2.653 / 2.783 / 3.185. Mean flow magnitude per tercile was only 3.25 / 3.71 / 4.26 px per 20 min, i.e. the motion in this ROI is small.

**Interpretation:** because motion is small, RIFE needs *finer* flow resolution, not coarser. That led to trying higher scales.

### 5.5 Higher RIFE scale and the blend

Dynamic-pixel RMSE (K):

| Engine | Day A | Day B |
|---|---|---|
| B1 DIS flow | 2.500 | 2.693 |
| B3 scale 1.0 | 2.567 | 2.736 |
| B3 scale 1.5 | 2.490 | 2.627 |
| B3 scale 2.0 | 2.491 | 2.619 |
| Blend B1 + B3 (s1.0) | 2.435 | 2.599 |
| **Blend B1 + B3 (s2.0)** | **2.407** | **2.559** |

Bootstrap vs B1: B3 s1.5 on Day A = −0.010 K [−0.016, −0.004]; B3 s2.0 on Day B = −0.073 K [−0.081, −0.065]; **blend s2.0** = −0.092 K [−0.100, −0.086] (Day A) and −0.134 K [−0.140, −0.127] (Day B).
Full table of MAE/RMSE/SSIM for all variants is in `dayA_scale_blend.csv` / `dayB_scale_blend.csv`.

**Summary:** RIFE at scale ≥ 1.5 matches or slightly beats classical flow; the 50/50 blend beats both (≈ 3.7% lower dyn RMSE than B1 on Day A, ≈ 5.0% on Day B, and ≈ 40% lower than plain averaging).

### 5.6 Sharpness check (does the blend win only by blurring?)

| Metric | Day A: B0 / B1 / B3 s2 / Blend | Day B: B0 / B1 / B3 s2 / Blend |
|---|---|---|
| Gradient correlation | 0.751 / 0.901 / 0.906 / **0.909** | 0.805 / 0.914 / 0.922 / **0.923** |
| Gradient-magnitude ratio | 0.819 / 0.854 / 0.879 / 0.857 | 0.846 / 0.865 / 0.889 / 0.867 |
| High-frequency power ratio | 0.522 / 0.191 / 0.317 / 0.193 | 0.513 / 0.185 / 0.321 / 0.193 |
| Bias (K) | −0.002 / −0.010 / +0.029 / +0.010 | +0.001 / −0.003 / +0.041 / +0.019 |

Reading: the blend has the best edge alignment and is as sharp as B1 (so its lower error is not just smoothing). RIFE alone keeps more fine detail but has higher error. The high-frequency ratio is low for every method partly because the top spatial frequencies contain sensor noise that no interpolator can predict; use it as a relative comparison, not an absolute "% of detail lost".

---

## 6. Output files produced

| File | Content |
|---|---|
| `crops_dayA.npz`, `crops_dayB.npz` | 144 × 512 × 512 BT crops + timestamps |
| `triplets_A.npy`, `triplets_B.npy` | 142 triplet index rows each |
| `A_B2.npz`, `A_B3.npz`, `A_B3_s05.npz`, `A_B3_inv.npz`, `A_B3_s15.npz`, `A_B3_s20.npz` | RIFE predictions, Day A |
| `B_B2.npz`, `B_B3.npz`, `B_B3_s15.npz`, `B_B3_s20.npz` | RIFE predictions, Day B |
| `dayA_baselines.csv`, `dayA_results.csv`, `dayB_results.csv`, `dayA_ablations.csv`, `dayA_scale_blend.csv`, `dayB_scale_blend.csv` | Result tables |
| `rife_run.py`, `rife_pkg/` | RIFE inference script and the copied code + weights |
| **`framefill_dayA_10min.nc`** | 10-minute sequence, see below |

**`framefill_dayA_10min.nc` (verified on reopening):** 73 frames, 512 × 512, **37 observed + 36 synthetic**, uniform 10-min step, covering 12 hours of Day A. Variables: `brightness_temperature` (K, float32, compressed), `frame_type` (0 = observed, 1 = SYNTHETIC), `interp_fraction`. Global attributes include a `warning` stating synthetic frames are not observations, `source`, `method` (50/50 DIS + RIFE s2.0), `bt_range_k`, `Conventions = CF-1.8`, `roi_pixels`. File size 48.6 MB.
Known gaps: `x`/`y` have no coordinate values or projection metadata; not tested in an external viewer (Panoply/ncview).

**Side-by-side GIF (`framefill_compare.gif`):** the code was provided (real 20-min feed | our 10-min sequence with OBSERVED/SYNTHETIC badge | real 10-min truth) but its output has **not been confirmed** by us yet.

---

## 7. Engineering history (what went wrong and how it was fixed)

1. **Original notebook crashed/"went to draft" in Kaggle.** The smoke-test log was never read, so the exact original cause was never confirmed. Hardening applied: copy RIFE code + weights from read-only `/kaggle/input` into a writable `/kaggle/working/rife_pkg`; stub the training-only `model.loss` import (avoids VGG/pretrained downloads); set `KMP_DUPLICATE_LIB_OK` and thread limits; pad to a multiple of `max(128, 128/scale)` instead of 32; run RIFE in a **subprocess** so a native crash can't kill the notebook; print full tracebacks.
2. **Session resets wipe `/kaggle/working`.** Changing the accelerator or restarting clears it. Mitigations: skip-if-exists logic; **Save & Run All (Commit)** keeps outputs; saved outputs can be re-attached as an input (`/kaggle/input/notebooks/arpitdeosthale/be-project`) and restored with a copy cell.
3. **Restore path.** The saved output already contained `rife_pkg/` and `rife_run.py`, so RIFE jobs were rerun from there without re-attaching the RIFE datasets.
4. **Bugs in our own cells (fixed):** a dict-`|`-set `TypeError` in the sequence-chain code; evaluation cells that depended on variables from earlier cells (replaced by self-contained versions).
5. **Final successful run:** full pipeline ran with CUDA, 142/142 predictions per job, no crash.

---

## 8. Caveats and honest limits

- **Single ROI, single season window, two days.** Results say "this works here", not "this works everywhere". Motion in the ROI is small (≈ 3–4 px per 20 min); behaviour on fast cyclones or strong convection is untested.
- **Day B is a second validation day, not a clean test set.** Scale choice and the blend were examined on both days. A truly untouched third day is still needed for a final claim.
- **The blend (B5) is post-hoc.** It was not in the pre-registered engine list (B0–B4) of the SDLC package. Record it as a documented deviation.
- **Bootstrap CIs are optimistic.** Neighbouring triplets share frames and weather, so they are not independent; read CIs as "the ordering is stable".
- **GOES → INSAT domain shift.** Pixel size, viewing angle and spectral response differ; nothing here validates INSAT.
- **Flow methods cannot create or destroy cloud.** Remaining error (~2.4 K dyn RMSE) likely includes genuine formation/dissipation that interpolation cannot capture.
- **No fine-tuning (B4)** has been attempted, so the PS preference for "models trained on satellite data" is currently unmet. Pretrained RIFE with a tuned scale is the learned model used.
- **Synthetic frames are model output, never observations.** Every exported file and animation must keep the SYNTHETIC label; do not derive retrievals from them. NOAA data is public but modified here, so do not present outputs as original NOAA data.

---

## 9. Mapping to PS requirements (status)

| PS requirement | Status |
|---|---|
| PS-01 optical-flow motion estimation | **Done** (DIS flow, B1) |
| PS-02 DL frame interpolation | **Done** (pretrained RIFE v4.22) |
| PS-03 higher temporal resolution | **Done for GOES 20→10 min**; recursion (15→7.5) not done |
| PS-04 validation vs real data (MSE, PSNR, SSIM…) | **Done** for MAE/RMSE/PSNR/SSIM + dynamic subset; **FSIM not computed** |
| PS-05 GOES-19 C13 | **Done**; INSAT / Himawari **not done** |
| PS-06 `.nc` output | **Done** (framefill_dayA_10min.nc); input was `.nc` |
| PS-07 dashboard with animations | **Not done** (GIF code provided; web dashboard not built) |
| PS-08 report with plots | **Not done** (tables exist, no plots/report yet) |
| PS-09 INSAT-3DS 15-min animation | **Not done** (no INSAT data yet) |
| PS-13 prefer satellite-trained model | **Not met** (no fine-tune) |

---

## 10. Getting INSAT data (next required step)

1. Register at **mosdac.gov.in** and wait for account approval (turnaround unknown — do this first).
2. After login: **Order → Archived Data → Satellite**, choose INSAT-3DS (or 3DR) **Imager**, TIR1 channel, a small window (1–2 days at 30 min), HDF format. Add to cart and submit; you get a request ID and an email when ready. No payment.
3. Download from `sftp://ftp.mosdac.gov.in` (MOSDAC credentials) or the portal's download button.
4. Send one `.h5` file; it is needed to find the TIR1 variable name, the count→temperature lookup table and the grid layout before writing the loader.
5. MOSDAC data is free for non-commercial use; keep attribution; do not redistribute raw files. The doc-store claim of a 5,000 files/day API limit comes from MOSDAC's API manual.
6. If INSAT data cannot be obtained, state "INSAT part not demonstrated" in the report rather than claiming it.

---

## 11. Recommended next steps (in priority order)

1. Get INSAT `.h5` data and write the loader; run P4 (60 → 30 min hold-out) and the 30 → 15 min qualitative animation with caveats.
2. Run the comparison GIF and confirm the animation looks right; then build the web dashboard (FastAPI + React) or at minimum a static HTML viewer.
3. Add a third, untouched GOES-19 day (ideally a different region/regime) as the final test; apply the chosen method once.
4. Compute missing metrics (FSIM, cold-cloud subset) and make the plots (error distributions, difference maps in kelvin, error vs motion).
5. Optional: fine-tune RIFE on satellite triplets (only worthwhile if a stronger gain over the blend is plausible), add projection/coordinates to the `.nc`.
6. Write the report with a clear "demonstrated vs targeted" table.

---

## 12. One-paragraph summary for the report

On two GOES-19 ABI Channel-13 days (22 and 19 Oct 2026; 512 × 512 crop; 142 held-out 20→10 min triplets each), optical-flow-based interpolation reduced dynamic-pixel RMSE by about 40% relative to simple frame averaging. Pretrained RIFE v4.22 matched or slightly beat classical DIS flow once its flow-estimation scale was raised to 1.5–2.0 (it was slightly worse at the default scale). A 50/50 blend of DIS flow-warp and RIFE (scale 2.0) gave the lowest error on both days (≈ 3.7% and 5.0% below DIS alone, paired-bootstrap CIs excluding zero) with the highest edge correlation and no loss of sharpness relative to DIS. These results are limited to one region, two days, and 20→10 minute gaps; INSAT-3DS validation has not yet been performed.
