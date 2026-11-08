# 09 — Technical and Scientific Validation Methodology (Phase 5)

**Version 0.1 · 2026-10-25 · Purpose:** Define a defensible way to evaluate interpolated thermal-IR frames and to word claims honestly. *No results are reported here; this is the protocol.*

---

## 1. Principles
1. **Ground truth = an observed frame** at the target time, withheld from the model.
2. **Evaluate in physical units first** (kelvin). Image-similarity scores are secondary and always reported with the normalisation used.
3. **Fixed normalisation** across all frames/experiments (180–330 K → [0,1]); no per-image min–max.
4. **Static backgrounds inflate scores**; therefore report dynamic-pixel subsets and skill versus a trivial baseline.
5. **Split by day**; choose test days before seeing results; test set used once.
6. **Separate** quantitative (GT) / qualitative (no GT) / baseline comparisons / demonstrated vs targeted.

---

## 2. Validation protocols

| Protocol | Data | Input pair → target | Ground truth | Use |
|---|---|---|---|---|
| **P1** | GOES-19 full-disk (10-min cadence) | frames at *t* and *t+20 min* → predict *t+10* | Observed frame at *t+10* | Primary quantitative test; mirrors PS example (00:00 & 00:20 → 00:10) |
| **P2** | GOES-19 sector product with 5-min cadence (e.g., CONUS) **[verify availability/cadence]** or Himawari 2.5-min regional **[verify]** | 10 → 5 min (or 5 → 2.5) | Observed frame | Smaller gap; analogous to "30→15" ratio |
| **P3** | Any sequence | Level-2 recursion: from {t, t+20} create t+10, t+5, t+15; compare with observed 5-min frames if exists; otherwise **cycle-consistency**: interpolate (t, t+20)→t+10, then re-interpolate with (t+10 predicted, t+20) etc. and measure deviation | Observed 5-min frames if available | Tests the 15→7.5 recursion analogue |
| **P4** | INSAT-3DS/3DR (30-min cadence) | frames at *t* and *t+60 min* → predict *t+30* | Observed INSAT frame at *t+30* | Real-sensor, domain-shift stress test: ratio 2:1 as in the PS, but a **longer** gap (hence harder) than 30→15 |
| **Q1** | INSAT 30→15, recursive 15→7.5 | — | **None** | Qualitative review + flicker/consistency + sanity metrics; labelled "unvalidated" |

> **What is and isn't claimable.** P1/P2/P4 support statements about *interpolation error at the tested gaps and regions*. They do **not** prove accuracy of the INSAT 15-min or 7.5-min frames. Those get Q1 evidence only, plus extrapolation from P4 with explicit caveats.

---

## 3. Metrics

Let `P` = predicted BT (K), `G` = observed BT (K), `V` = valid mask (valid in P, G and both inputs). Normalised images: `p = clip((P−180)/150, 0, 1)`, `g` likewise.

| Metric | Definition | Meaningful when | Pitfalls / handling |
|---|---|---|---|
| **MAE (K)** | mean over V of `|P−G|` | Always — primary physical error | — |
| **RMSE (K)** / **MSE (K²)** | √mean((P−G)²) | Penalises large errors (e.g., cold overshooting tops) | Sensitive to outliers; report both MAE and RMSE |
| **Bias (K)** | mean(P−G) | Detect systematic warming/cooling (blur tends to warm cold tops) | — |
| **PSNR (dB)** | `10·log10(R² / MSE)` with fixed **R = 150 K** (equivalently R=1 on normalised images) | For comparisons within this project | **Depends on R** — state it; not comparable with PSNR from other datasets/8-bit RGB |
| **SSIM** | `skimage.metrics.structural_similarity` on `p,g`, `data_range=1`, window 7; mean over V (use the SSIM map `full=True`, mask pixels whose window touches invalid pixels) | Structure/contrast preservation, cloud edges | Near 1 for static scenes; window edges at masks; compute also on dynamic mask |
| **FSIM** | Feature-similarity index on `p,g` (single-channel version; implementation via a vetted library or own code validated on test images **[verify]**) | Supplementary (named in PS) | Designed for natural images; treat as supplementary |
| **Dynamic-mask metrics** | MAE/RMSE/SSIM over `D`: pixels where smoothed (3×3 mean) `|I_a − I_b| > 3 K` between the two **input** frames | Focuses on pixels that actually changed | Threshold is a parameter; show sensitivity (2/3/5 K) |
| **Cold-cloud metrics** | MAE/RMSE where `G < 235 K` | Deep convective regions — operationally interesting | Smaller sample; report N pixels |
| **Gradient correlation** | Pearson corr. of Sobel-gradient magnitudes of `P` vs `G` | Edge/structure sharpness | Noise sensitive |
| **High-frequency power ratio** | Radially averaged PSD ratio `PSD(P)/PSD(G)` in the top 25% of wavenumbers | Detects blur (<1) or hallucinated texture (>1) | Requires cropping to periodic-friendly windows (use Hann window) |
| **Error-vs-displacement** | MAE binned by mean flow magnitude (px) from the B1 flow between inputs | Shows failure on large motion | Flow itself is approximate |
| **Skill vs B0** | `1 − MSE_model/MSE_B0` (dynamic mask) | Beating the trivial blend | Undefined if MSE_B0≈0 |
| **Temporal consistency (flicker)** | mean `|X_{n+1} − 2X_n + X_{n−1}|` over a sequence incl. synthetic frames, vs the same statistic on observed-only subsampled sequence | Detects jitter/ghost flashing | Real fast evolution also raises it; compare ratio to ground-truth sequence where available |
| **Cycle consistency (P3)** | Deviation between direct mid-frame and mid-frame obtained via recursion | Recursion stability | Not accuracy against truth |
| **Optical-flow sanity** | Forward–backward flow consistency error; warp-residual of B1 | Flow-quality diagnostic | Not a ground-truth accuracy |

### 3.1 Normalisation effect
PSNR/SSIM/FSIM change with the chosen BT range (`180–330 K`). Changing the range changes numbers, not rankings (to first order), but we freeze it and record it in every result file. MAE/RMSE/Bias in kelvin are independent of it.

### 3.2 Missing/invalid pixels
- Metrics computed only on `V`; the number of valid pixels is reported.
- SSIM windows overlapping invalid pixels are excluded.
- For network input only, invalid pixels may be nearest-neighbour filled, then **re-masked** on output; this is logged.
- Frames with > 20% invalid pixels in the ROI are excluded from evaluation (parameter) and counted.

### 3.3 Statistical reporting
Per-triplet metrics → median and mean with **paired bootstrap 95% CI** (1,000 resamples) for differences model − baseline. Report N triplets, dates, ROI, local time-of-day coverage (day/night; IR is available at night, but cloud dynamics vary diurnally).

---

## 4. Domain-specific concerns and how we address them

| Concern | Risk | Mitigation / test |
|---|---|---|
| **Temporal consistency** | Flicker, non-monotone motion | Flicker metric; sequence viewer; TC-038 |
| **Geospatial alignment** | Misregistration between frames or between GT and prediction | Same-grid check (`E-GRID`); no resampling; verify navigation via metadata where available |
| **Cloud-motion artefacts** | Ghosting, tearing, smeared edges | Visual QA checklist (TC-044); hf ratio; gradient correlation |
| **Non-advective change** (growth, decay, overshooting tops) | Flow cannot create/destroy energy | Report error in cold cores; failure analysis; state limitation |
| **Large displacement** | Flow estimation failure | Pyramid scale ablation (EXP-08); error vs displacement |
| **Missing data** | Spurious values at edges/limb | Union masks; margin ≥ 64 px; limb exclusion; counts reported |
| **Physical plausibility** | Values outside physical range; unrealistic temperature gradients | Range guard (`±5 K` beyond input extremes), clamp-fraction metric; per-pixel monotone check between bracketing observations (diagnostic) |
| **Preservation of scientifically meaningful values** | RGB networks may shift mean level or contrast | Bias metric; identity tests (t=0/1); no 8-bit quantisation; mean-BT drift diagnostic |
| **Sensor shift GOES→INSAT** | Different resolution/spectral response/viewing angle | P4 results shown separately; no cross-sensor pooling; clear caveat |
| **Hallucination** | Plausible but false structure | Always show difference map; label SYNTHETIC; recommend against retrievals from synthetic frames |

---

## 5. Qualitative inspection when GT is unavailable (Q1)
- Review ≥ 30 random INSAT 15-min frames (stratified by cloud activity) with a checklist: ghosting, seams, texture/noise change, edge continuity, temporal smoothness, plausible motion direction relative to neighbours.
- A second person (mentor/peer, ideally with meteorological background) reviews 10 sequences blind to the engine label (A/B: B1 vs best model) and records preferences.
- Consistency checks: observed frames reproduced at t=0/1; level-2 frames vs level-1 neighbours; BT histogram of synthetic frames vs bracketing frames.

## 6. Baseline comparisons
Always report **B0**, **B1 (DIS)**, learned engines on identical triplets. A learned model is "better" only if it beats B0 and B1 on dynamic-pixel RMSE with a paired-bootstrap CI excluding zero **and** passes visual QA. Otherwise the report says so.

## 7. Claims policy (what we may and may not write)

| Allowed | Not allowed |
|---|---|
| "On N=… held-out GOES-19 triplets (dates…), model X reduced dynamic-pixel RMSE by Y K (CI …) relative to B0." (only after measuring) | "Our model accurately reconstructs satellite frames" without protocol/N |
| "INSAT-3DS 15-min frames were generated; quantitative validation was done on 60→30 min hold-out (P4)." | "INSAT 15-min frames are validated/accurate" |
| "The system is a research prototype." | "Operational", "ISRO-approved", "meteorologically certified" |
| Report targets as *targets* | Mix targets with achieved results |
| "No ground truth exists for 7.5 min; recursion is qualitative." | Quoting metrics for 7.5-min frames without GT |
*Do not fabricate metrics, training outcomes, citations, benchmarks or completed experiments.*

## 8. Pre-registered decision criteria (summary)
Best-model rule (Doc 31); fine-tune adoption margin (Doc 29); test used once; sensitivity of masks reported; all deviations documented in the change log.
