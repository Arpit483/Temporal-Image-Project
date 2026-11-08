# 04 — Data and ML Development (Documents 26–32)

**Package version:** 0.1 Draft · **Date:** 2026-10-25 · Proposed; no experiment has been run.

---

## Doc 26 — Dataset Description and Data Acquisition Plan
**Purpose:** Which data, how to get it, access terms, volumes, risks.

| Dataset | Role | Access | Format | Cadence | Terms / caveats |
|---|---|---|---|---|---|
| **GOES-19 ABI-L2-CMIPF, Channel 13 (≈10.3 µm)** | Primary train/val/test; P1 | `s3://noaa-goes19/ABI-L2-CMIPF/YYYY/DDD/HH/` anonymous (`aws s3 ... --no-sign-request`), no AWS account (verified in AWS registry) | NetCDF-4 `.nc`; variable `CMI` (BT in K for IR bands, scaled int16 → use `xarray` decoding) | 10 min full disk (mode-6) **[verify]** | NOAA data open to public; modified data must not be presented as unaltered NOAA data |
| GOES-19 ABI-L1b-RadF C13 | Alternative if CMI unavailable (radiance→BT via file's planck constants) | same bucket | `.nc` | 10 min | Slightly more code |
| **INSAT-3DS / 3DR Imager TIR1 (≈10.8 µm)** | PS-09 application; P4 | MOSDAC portal: register → order archived data (Order > Archived Data > Satellite) → SFTP delivery; API downloader exists (limit 5,000 files/day/user); free, non-commercial use | HDF5 `.h5` (L1B/L1C) | 30 min | Account approval; product variable names/LUTs to be inspected **[verify]**; INSAT-3DS at 82°E, 6-channel imager |
| Himawari-9 / -8 AHI B13 (≈10.4 µm) | Optional extra train/val over Asia–Pacific | `s3://noaa-himawari9/`, `s3://noaa-himawari8/` anonymous | JMA L1b (HSD segments), **not `.nc`** → needs `satpy` conversion | 10 min full disk | Attribution to JMA/NOAA; no endorsement claims; Himawari-8 is back-up satellite per registry text |

### 26.1 Acquisition procedure
1. **Day 1:** register MOSDAC; create a small order (e.g., 2 days × 48 frames TIR1). Keep credentials in `.env` (never commit).
2. `aws s3 ls --no-sign-request s3://noaa-goes19/ABI-L2-CMIPF/<year>/<doy>/<hh>/` to confirm availability and file naming. Pattern: `OR_ABI-L2-CMIPF-M6C13_G19_s<YYYYDDDHHMMSSs>_e…_c….nc` **[verify]**.
3. Download **inside Colab/Kaggle** (US data centre → faster) with `boto3` UNSIGNED or `s3fs` anon; immediately crop ROI and save `FrameFill-NC` crops; discard full-disk files.
4. Log SHA-256 and source key in `manifest.csv`.

### 26.2 Proposed sampling (to be fixed in `configs/data.yaml`)
| Split | GOES-19 days (examples to choose; must be distinct & non-adjacent) | Frames (≈144/day) |
|---|---|---|
| Train | 7 days across ≥ 2 seasons/regimes if possible | ≈ 1,000 |
| Val | 2 days | ≈ 290 |
| Test | 2 days (never used for tuning) | ≈ 290 |
| INSAT | ≥ 2 days incl. active convection | ≈ 96 |
Choose ROIs with active cloud systems (tropical convection) *and* some quiet regions to avoid biasing to static scenes. Record chosen dates and ROI in the experiment log — **do not pick test days after seeing results.**

### 26.3 Data-volume estimate (assumption)
≈ 7+2+2 days × 144 × (10–40 MB) ≈ 16–65 GB transient download; retained crops ≈ 1,600 × 2 MB ≈ 3 GB. Budget 100 GB free disk for the transient phase or stream-and-crop.

---

## Doc 27 — Data Preprocessing Specification

| # | Operation | Specification |
|---|---|---|
| 1 | Decode | `xarray.open_dataset(..., mask_and_scale=True)`; take `CMI` (GOES) or the TIR1 variable (INSAT) |
| 2 | Units | K. If radiance: BT via inverse Planck with file constants. If counts: LUT lookup |
| 3 | Invalid | `NaN` where fill/off-disk/space; mask = `isfinite & 150≤BT≤350` |
| 4 | Time | Parse from file attrs/filename; UTC; reject unparseable |
| 5 | Grid | Compute `grid_id` from projection attrs + coordinate hash; frames in one sequence must match |
| 6 | Crop | ROI in native pixel indices; margin ≥ 64 px from invalid areas |
| 7 | Normalise | `x = clip((BT - 180)/(330 - 180), 0, 1)`; fixed constants from config; **never per-image min-max** (would destroy cross-frame consistency and physical meaning) |
| 8 | Polarity (ablation A1) | optionally `x ← 1 − x` so cold cloud = bright (matches natural imagery) |
| 9 | Channels | replicate to 3 channels for RGB-trained networks |
| 10 | Padding | reflect-pad to multiple of 32 (or model requirement); remove after inference |
| 11 | Tiling | tile ≥ 512, overlap 64, cosine blend; verify no seams (TC-026) |
| 12 | Missing pixels in only one frame | Use union mask; interpolated pixel invalid if invalid in either input; inpaint **only** for network input (nearest valid) and re-mask on output |
| 13 | Denormalise | `BT = x·150 + 180`; clamp to `[min(f0,f1) − 5 K, max(f0,f1) + 5 K]` only as guard; log clamp fraction |
| 14 | Quantisation | None — keep float32 (8-bit only for flow estimation / display) |
| 15 | Provenance | Store parameters in FrameFill-NC attrs |

**Brightness-temperature preservation tests:** identity (t=0 → f0; t=1 → f1) must reproduce inputs within 1e-3 K for B0/B1; mean BT difference between synthetic and the average of inputs reported per run.

---

## Doc 28 — Data Dictionary

| Name | Type | Unit | Description | Source |
|---|---|---|---|---|
| `CMI` | float (scaled int16 on disk) | K | GOES ABI cloud & moisture imagery; IR channels = BT | GOES-19 L2 |
| `x`,`y` | float | rad (scan angle) | GOES fixed-grid coordinates | GOES-19 |
| `goes_imager_projection` | scalar attrs | — | Projection params | GOES-19 |
| `IMG_TIR1` (name to verify) | uint16 counts | count | INSAT TIR1 raw counts | INSAT L1B |
| `IMG_TIR1_TEMP` (name to verify) | float LUT / array | K | Count→temperature LUT or BT image | INSAT L1B/L1C |
| `brightness_temperature` | float32 | K | Canonical BT | FrameFill-NC |
| `valid` | bool | — | Valid-pixel mask | Derived |
| `frame_type` | int8 | flag | 0 observed, 1 interp L1, 2 interp L2 | Derived |
| `interp_fraction` | float32 | 0–1 | Temporal fraction between bracketing observed frames | Derived |
| `dyn_mask` | bool | — | Dynamic pixels: smoothed `|f_a − f_b| > 3 K` | Eval |
| `cold_mask` | bool | — | `BT_gt < 235 K` | Eval |
| `MAE_K`, `RMSE_K` | float | K | Error vs GT | Eval |
| `PSNR_dB` | float | dB | With fixed `data_range = 150 K` | Eval |
| `SSIM` | float | — | On normalised [0,1], win 7 | Eval |
| `FSIM` | float | — | On normalised [0,1] (supplementary) | Eval |
| `grad_corr` | float | — | Sobel-magnitude Pearson correlation | Eval |
| `hf_ratio` | float | — | High-frequency spectral power ratio pred/GT | Eval |
| `flicker_K` | float | K | Mean abs 2nd temporal difference of sequence | Eval |
| `skill_vs_B0` | float | — | `1 − MSE_model / MSE_B0` | Eval |

---

## Doc 29 — Model Training / Fine-Tuning Plan (MVP-plus)

| Item | Plan |
|---|---|
| Goal | Test whether light fine-tuning of RIFE on satellite BT triplets improves hold-out error vs B3 |
| Precondition | B3 evaluated on val; GPU available; RIFE training code identified **[verify repository containing `train.py` and data loader; adapt rather than rewrite]** |
| Data | ≈1,000 train frames → triplets at Δ=10 min (and Δ=20 min for larger motion) → crops 256–512 px (random) |
| Samples | ≈ 8–20k random-crop triplets/epoch (to tune); validation fixed set |
| Initialisation | Pretrained RIFE weights |
| Optimiser | AdamW; LR from {1e-5,5e-5,1e-4}; cosine decay; weight decay 1e-4 (starting points, not tuned) |
| Batch | As GPU allows (e.g., 8–16 for 256² crops) |
| Epochs | 3–10; early stopping on val MAE in dynamic mask |
| Loss | L1 (normalised) + 0.1·gradient L1 + Laplacian-pyramid loss (as in the RIFE family) — weights tuned on val |
| Augment | H/V flip, rot90, temporal reversal; **no** colour jitter (would alter physical BT) |
| Checks | No leakage (split by day); seed fixed; deterministic data order; checkpoint every epoch |
| Compute estimate | A few GPU-hours on a free-tier T4-class GPU **[unverified; benchmark first]**; if sessions are time-limited, checkpoint/resume |
| Stop rule | If after 12 runs B4 does not beat B3 by a pre-registered margin (e.g., ≥ 3% MAE reduction in dynamic mask with paired bootstrap CI excluding 0), declare B3 the best model |
| Output | `models/rife_ff_v0.1.pth`, config, training log, model card update |

---

## Doc 30 — Experiment Tracking and Evaluation Plan

**Tracking:** each run writes `experiments/EXP-xxx/{config.yaml,metrics.json,env.txt,git.txt,notes.md}`; summary table `experiments/summary.csv`. Use MLflow/W&B only if free and allowed; the CSV is authoritative.

| EXP | Engine / change | Dataset split | Protocol | Purpose |
|---|---|---|---|---|
| EXP-01 | B0 blend | val | P1 | Lower reference |
| EXP-02 | B1 DIS flow-warp | val | P1 | Classical flow baseline |
| EXP-03 | B1 Farneback | val | P1 | Flow-method sensitivity |
| EXP-04 | B2 RIFE naive (replicate, per-image min-max) | val | P1 | Show why fixed range matters |
| EXP-05 | B3 RIFE fixed-range | val | P1 | Reference learned model |
| EXP-06 | B3 + polarity invert (A1) | val | P1 | Ablation |
| EXP-07 | B3 tile 512 vs 1024 (A2) | val | P1 | Seam/context effect |
| EXP-08 | B3 `scale` ∈ {0.5,1.0} | val | P1 | Large-motion handling |
| EXP-09 | B3 on 10→5 min (if CONUS-sector data used) / alt cadence | val | P2 | Smaller gap |
| EXP-10 | B3 on INSAT 60→30 | INSAT | P4 | Domain-shift stress test |
| EXP-11 | B4 fine-tuned (best config) | val → **test once** | P1 | PS-13 |
| EXP-12 | B4 on INSAT 60→30 | INSAT | P4 | Transfer |
| EXP-13 | Best model recursive (L2) | val | P3 (cycle) | Recursion quality |
| EXP-14 | Best model INSAT 30→15 | INSAT | qualitative + flicker | PS-09 |

**Rule:** choose the best config on **val**; evaluate **test once**; report both. Statistics: paired bootstrap (1,000 resamples) over triplets for differences vs B0/B1.

---

## Doc 31 — Model Selection and Baseline Comparison

**Decision rule (pre-registered):** the "best model" is the engine with the lowest val **RMSE_K in dynamic mask** among {B1, B3, B4}, provided its SSIM (all-valid) is not worse than B0 by > 0.01 and visual QA shows no systematic artefacts (checklist TC-044). Ties → simpler model.

| Candidate | Expected strengths | Expected weaknesses | Status |
|---|---|---|---|
| B0 | No artefacts of its own; trivial | Ghosting | Baseline |
| B1 | Physically interpretable motion | Edge blur, fast motion fails | Baseline |
| B2 | — | Poor normalisation expected | Negative control |
| B3 | Strong generic interpolation | Unvalidated on BT | Candidate |
| B4 | Adapted to BT | Overfit risk; needs GPU | Candidate |
"Expected" = hypothesis, not result. Fill the table with measured numbers in Doc 42.

---

## Doc 32 — Model Card (template, pre-filled with intended use and limitations)

**Model name:** FrameFill-Interpolator (engine B3/B4) · **Version:** to be assigned · **Date:** — · **Status:** Draft; no results yet.

| Section | Content |
|---|---|
| Model details | RIFE-based (weights provenance and licence **[to be recorded]**); optional fine-tune on GOES-19 C13 crops |
| Intended use | Visual and quantitative exploration of intermediate frames between two observed TIR frames; research/education; hackathon demonstration |
| Out-of-scope use | Operational forecasting, warnings, safety-critical decisions; scientific retrievals (cloud-top height, rainfall, winds) from synthetic frames; extrapolation beyond observed interval; any presentation of synthetic frames as observations |
| Training data | Pretrained: generic video (per upstream card). Fine-tune: GOES-19 ABI C13 crops, dates **[fill]**; INSAT not used for training unless stated |
| Evaluation data | Held-out GOES-19 days; INSAT P4 hold-out |
| Metrics | See doc 09; **[fill with measured values, with N, CI, masks]** |
| Known limitations | Cannot represent cloud formation/dissipation not explained by advection; may smooth overshooting tops; errors grow with gap length; sensor/geometry shift between GOES-19 and INSAT; INSAT 15-min and recursive 7.5-min outputs have no ground truth |
| Ethical/Responsible-use | Always label synthetic frames; keep NOAA/JMA/MOSDAC attribution; no endorsement claims |
| Failure examples | **[add images of worst triplets]** |
| Maintenance | Re-evaluate on new satellites/seasons before any reuse |
