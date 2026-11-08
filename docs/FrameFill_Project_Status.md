# FrameFill: Project Status Summary

**Date:** 26 Oct 2026 · **Problem Statement:** Bharatiya Antariksh Hackathon 2026 (ISRO × Hack2skill), PS 12, "Fill in the Frames Seamlessly"
**One-line status:** A validated GOES-19 frame-interpolation prototype with a measured, repeatable gain over baselines on four days (two clean test days), a packaged FastAPI + web app, and a draft report. **INSAT-3DS was not demonstrated (no data) and no satellite-trained model was built.**

---

## 1. What the project does

Given two observed thermal-IR frames, FrameFill predicts the frame in between and scores it against the real observed frame in kelvin. Everything it produces is labelled **SYNTHETIC**; it is not an observation and must not be used for forecasting, warnings or retrievals.

**Final method (chosen on validation days A and B, fixed before the clean tests):**
1. Fixed brightness-temperature range 180–330 K (never per-image min–max). Missing pixels are filled for the network only, then re-masked on output.
2. **B1:** OpenCV DIS optical flow (flow on 8-bit copies, warping on float32 BT).
3. **B3:** pretrained Practical-RIFE v4.22, flow scale 2.0, no fine-tuning.
4. **Final output:** 50/50 blend of B1 and B3, clipped to the input range ±5 K.

---

## 2. What has been done, in order

| # | Work | Where | Status |
|---|---|---|---|
| 1 | PS analysis, gaps, MVP choice, SDLC document package (docs 00–11) | `docs/` | Done (design only) |
| 2 | GOES-19 Ch13 download from NOAA S3, 512×512 crops, triplet builder | Kaggle notebook | Done |
| 3 | Baselines: B0 average, B1 DIS flow-warp | Kaggle notebook | Done |
| 4 | RIFE runs and ablations: naive normalisation vs fixed range, polarity inversion, flow scale, blend | Kaggle notebook | Done |
| 5 | Metrics: MAE, RMSE, PSNR (fixed 150 K range), SSIM, FSIM, dynamic-pixel and cold-cloud (<235 K) subsets, bias, paired bootstrap | Kaggle notebook | Done |
| 6 | 10-minute `.nc` sequence with observed/synthetic flags and comparison GIF | Kaggle notebook | Done |
| 7 | **60→30 min stress test** on GOES (INSAT-like cadence), days A, B, C, D | Kaggle notebook | Done |
| 8 | **Day C clean test** (new day, new region), scored once | Kaggle notebook | Done |
| 9 | **Day D clean test** (stormy region). Day and region locked from input frames only, before any model run; scored once | Kaggle notebook | Done |
| 10 | Plots: error distributions, error vs motion, kelvin difference maps | `figs/` (Kaggle) | Done |
| 11 | Static HTML viewer with synced playback and SYNTHETIC badge | Kaggle cell | Code written; **user output not confirmed** |
| 12 | HTML report generator | Kaggle cell | Code written; **user output not confirmed**; does not include Day D yet |
| 13 | `.nc` with real x/y scan angles, GOES projection and computed lat/lon | Kaggle notebook | Done; reads back in two libraries |
| 14 | **Packaged project** (engine, IO, metrics, FastAPI, web UI, CLI, tests, Dockerfile, README) | `framefill.zip` | Done; 8 tests pass in a no-GPU, no-RIFE environment |

---

## 3. Measured results

Dynamic-pixel RMSE in kelvin (lower is better). Dynamic pixels are those where the two input frames differ by more than 3 K (3×3 smoothed).

### 20 → 10 min

| Day | Role | Scene activity | Average | DIS | RIFE s2.0 | **Blend** |
|---|---|---|---|---|---|---|
| A (22 Oct) | Validation (used to tune) | busy | 4.193 | 2.500 | 2.491 | **2.407** |
| B (19 Oct) | Validation (used to tune) | busy | 4.033 | 2.693 | 2.619 | **2.559** |
| C (16 Oct, new region) | **Clean test** | quiet, ~10% dynamic, almost no cold cloud | 4.552 | 1.990 | 1.959 | **1.876** |
| D (15 Oct, new region) | **Clean test** | stormy, ~62% dynamic, ~33% cold cloud | 5.678 | 3.042 | 2.916 | **2.855** |

### 60 → 30 min (GOES data at INSAT-like cadence; not an INSAT result)

| Day | Average | DIS | RIFE s2.0 | **Blend** |
|---|---|---|---|---|
| A | 7.787 | 6.290 | 6.359 | **5.918** |
| B | 7.795 | 6.750 | 6.495 | **6.216** |
| C (clean) | 7.026 | 4.728 | 4.721 | **4.379** |
| D (clean) | 10.154 | 7.984 | 7.485 | **7.158** |

### Paired bootstrap, blend minus DIS, dynamic-pixel RMSE (K; negative = blend better)

| Gap | A | B | C (clean) | D (clean) |
|---|---|---|---|---|
| 20→10 | not re-run here | not re-run here | −0.113 [−0.123, −0.104] | −0.187 [−0.195, −0.179] |
| 60→30 | −0.372 [−0.394, −0.352] | −0.534 [−0.558, −0.511] | −0.349 [−0.478, −0.240] | −0.826 [−0.864, −0.789] |

### Cold-cloud error (RMSE where observed BT < 235 K), 20→10 min

| Day | DIS | RIFE s2.0 | Blend |
|---|---|---|---|
| A | 1.745 | 1.616 | **1.593** |
| B | 1.904 | **1.717** | 1.738 |
| D (clean) | 2.000 | **1.780** | 1.797 |

Day C is omitted because only about 0.1% of its pixels are cold, which is too few to be meaningful.

### What the results support

- Optical-flow methods clearly beat plain averaging on every day and gap (about 30–50% lower dynamic-pixel RMSE).
- The 50/50 blend had the lowest dynamic-pixel RMSE on every day and gap tested, with bootstrap intervals that exclude zero.
- RIFE alone is not always better than DIS (tied or worse on some calmer cases), but it was clearly better on the stormy Day D and in cold clouds. This looks like a pattern with scene activity and gap length; it is an observation across four days, not a tested explanation.
- Bias was small on Days A and B (within about 0.02 K), and edge sharpness (gradient correlation) was about 0.91–0.92 for the flow-based methods, as measured earlier in the notebook.

---

## 4. Status against the PS requirements

| Req | PS requirement | Status | Note |
|---|---|---|---|
| PS-01 | Optical-flow motion estimation | **Done** | DIS flow-warp |
| PS-02 | Deep-learning frame interpolation | **Done** | Pretrained RIFE v4.22 |
| PS-03 | Higher temporal resolution (30→15→7.5 or equivalent) | **Partly** | GOES 20→10 and 60→30. The 15→7.5 recursion has not been run |
| PS-04 | Validate against real data with SSIM, MSE, PSNR, FSIM | **Done** | Four days, two clean; subsets and bootstrap included |
| PS-05 | GOES-19 / INSAT / Himawari thermal-IR data | **Partly** | GOES-19 only |
| PS-06 | `.nc` in and out | **Partly** | Written with coordinates and projection; read back by xarray and netCDF4. **Not yet opened in Panoply or ncview** |
| PS-07 | Dashboard with original vs interpolated animations | **Partly** | Static HTML viewer and a FastAPI + HTML upload app. No React |
| PS-08 | Report with plots | **Partly** | Report code and figures exist; Day D, captions and a final read-through are still to add |
| PS-09 | INSAT-3DS/3DR 15-minute animation | **NOT DONE** | INSAT data not available |
| PS-13 | Preferably models trained on satellite data | **NOT DONE** | No fine-tuning; pretrained RIFE only |

---

## 5. Deliverables inventory

**`framefill.zip`** (packaged project)
- `framefill/` engines (average, DIS, RIFE, blend), IO (`.nc`, `.npy`, images), metrics, renderer, FastAPI, CLI
- `web/index.html` upload two frames, optional real middle frame, animation with OBSERVED/SYNTHETIC badge, difference map, scores, `.nc` download
- `tests/` 8 tests: known-shift check, NaN propagation, metrics, bootstrap, `.nc` round trip and flags, loader errors, API smoke and error handling
- `notebooks/` Kaggle research notebook with outputs stripped
- `docs/` project log and SDLC document package
- `Dockerfile`, `requirements.txt`, `README.md`

**Kaggle working files** (download these; a session reset wipes them)
- Crops and predictions (`crops_day*.npz`, `*_B3_s*.npz`, `triplets_*.npy`), result CSVs, `figs/*.png`
- `framefill_dayA_10min.nc`, `framefill_dayA_10min_geo.nc`, the comparison GIF, `dayD_choice.json`
- `rife_run.py`, `rife_pkg/` and the two Kaggle datasets for RIFE code and weights (needed to reproduce RIFE runs)

---

## 6. Limitations to state in any write-up

- **No INSAT result.** GOES-to-INSAT differs in pixel size, viewing angle and spectral response. The 60→30 test shows behaviour at a longer gap only.
- **Two clean test days**, one region each, not the full range of weather. Cyclones and other extreme systems are untested.
- **Large absolute errors on convective cells:** about 2.9 K at 20→10 and about 7 K at 60→30 on the stormy day. Difference maps show ±10 K errors around growing or changing cells; flow methods cannot create or destroy cloud.
- **Days A and B were used to choose the scale and the blend,** so they are validation days. The blend was not in the original plan (documented deviation).
- **Bootstrap intervals are optimistic** because neighbouring triplets share frames; read them as "the ordering is stable".
- **Error-vs-motion plot** does not support a claim that error rises with motion; the motion groups come from crop-wide averages and these crops have little fast motion.
- **FSIM** is designed for natural images and is supplementary.
- **Validated at 512×512 only.** The app caps uploads at 1024 px; larger tiles and seams are untested.
- **Image uploads (PNG/JPG)** are visual mode only: values are not real brightness temperatures.
- **Computed lat/lon** comes from the scan-angle formula, not an official NOAA navigation product.
- NOAA data is public, but it is modified here; never present outputs as original NOAA data.

---

## 7. What remains

### Needs your action
1. **Download the Kaggle outputs** listed in section 5 so a session reset can't wipe them.
2. **Run or re-check the viewer and report cells**, open both HTML files, and send back errors or empty sections.
3. **Open `framefill_dayA_10min_geo.nc` in Panoply or ncview** and confirm the map is placed correctly (closes the PS-06 check).
4. **Run one real RIFE prediction in the packaged app** with `rife_pkg/` in `third_party/`, and compare with your notebook output. The packaged RIFE path is ported from the notebook but untested here.

### Work still to do
| Priority | Item | Effort |
|---|---|---|
| High | Add Day D and per-figure captions to the report; final read-through | Small |
| High | INSAT (PS-09): keep the MOSDAC request pending; ask organisers or contacts for even one `.h5` file; write the loader when a file arrives | Blocked on data |
| Medium | Fine-tune RIFE on GOES crops (PS-13), or state explicitly that it was skipped | Days; Day D suggests the learned side matters more in active scenes |
| Medium | 15→7.5 min recursion test (self-consistency only; no ground truth exists) | Small |
| Low | React front end instead of static HTML | Medium |
| Low | Modularise further, CI, more tests | Small to medium |
| Admin | The PS calendar (registration closed, finale 6–7 Aug 2026) has passed; confirm eligibility or treat this as a portfolio/academic project | — |

---

## 8. Overall stage

| Area | Stage |
|---|---|
| Core science (method, baselines, validation) | **Complete for GOES-19**, with two clean test days |
| Data coverage | GOES-19 only; INSAT not obtained |
| Software | **Working prototype**: package, API, web UI, CLI, tests; RIFE path to be confirmed on your machine |
| Report | **Draft**: needs Day D, captions and review |
| PS requirements | 5 done or mostly done, 4 partial, 2 not done (PS-09, PS-13) |
| Readiness | A credible, honestly scoped prototype. The biggest remaining gaps are INSAT data and satellite-specific training. |
