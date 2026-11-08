# 00 — PS Analysis, Gaps, and Recommended MVP

**Version:** 0.1 · **Date:** 2026-10-25 · **Purpose:** Establish exactly what the PS requires (explicit) versus what we choose (design decisions), and fix the MVP that every later document follows.

---

## 1. PS Extraction (Problem Statement 12)

**Title:** *Fill in the Frames Seamlessly — Enhancing Temporal Resolution of Satellite Imagery using AI/ML based on Optical Flow*

**Problem in one paragraph.** Geostationary imagery arrives at fixed cadence (INSAT ≈ 30 min, Himawari/GOES ≈ 10 min). That limits near-real-time monitoring of fast phenomena (cyclones, thunderstorms, fires, floods). Classical optical-flow temporal interpolation blurs and fails for fast / non-linear cloud motion. The task is to build an AI/ML optical-flow frame-interpolation prototype that synthesises intermediate frames between two consecutive images.

### 1.1 Requirement checklist (explicit = from PS text)

| ID | Explicit PS requirement | Where in PS | Type |
|---|---|---|---|
| PS-01 | Develop an optical-flow-based model to estimate motion vectors between consecutive satellite frames | Objective 1; Solution §1 "Optical Flow Estimation" | Functional |
| PS-02 | Generate synthetic intermediate frames using deep-learning frame interpolation | Objective 2 | Functional |
| PS-03 | Improve temporal resolution, e.g. 30→15→7.5 min "or equivalent" | Objective 3 | Functional |
| PS-04 | Validate against real higher-temporal-resolution data (Himawari / GOES-19) using SSIM, MSE, PSNR, FSIM, etc. | Objective 4 | Validation |
| PS-05 | Use thermal-IR (~10 µm) geostationary data: GOES-19 ABI Ch13 (NOAA AWS), INSAT-3DS/3DR TIR1 (MOSDAC), Himawari-8 | Dataset Required | Data |
| PS-06 | Input data are `.nc` or `.h5`; **model input and output files must be `.nc`** | Dataset Required; Solution §1 | Data/Interface |
| PS-07 | Dashboard showing original vs interpolated animations (time-lapse), for both ground-truth frames and interpolated frames | Solution §2 | Functional |
| PS-08 | Report comparing generated frames with ground truth: SSIM, MSE, FSIM etc., with plots; other cloud-motion-suitable metrics allowed | Solution §3 | Deliverable |
| PS-09 | Apply best model to INSAT-3DR/3DS and produce animations at 15-min temporal resolution | Solution §4 | Functional |
| PS-10 | Use web technologies for visualisation | Suggested Tools | Constraint |
| PS-11 | Evaluation: image-quality metrics (MSE, PSNR, others); Web GUI design; visual quality of INSAT-3DS interpolation | Evaluation Parameters | Judging |
| PS-12 | Suggested (not mandatory) models: Super SloMo, RIFE; "can be trained/fine-tuned" | Suggested Tools | Guidance |
| PS-13 | Optical-flow models "preferably trained on satellite data" | Solution §1 | Preference |
| PS-14 | Steps 1–3 may use GOES-19 or another high-cadence GEO satellite (e.g. 00:00 and 00:20 → predict 00:10); Step 4 applies trained model(s) to INSAT-3DS | Solution footnote | Protocol |
| PS-15 | Eligibility: students (UG/PG/PhD) in Indian institutions; teams of 3–4; India only; free to participate; 30-hour event; idea phase needs concept proposal per provided templates | Header, FAQ | Administrative |

### 1.2 Non-functional requirements and evaluation criteria in the PS
The PS states **no numeric accuracy threshold, latency target, hardware limit, deployment target, or file-size limit.** The only stated evaluation criteria are listed under PS-11. Judging weights are **not stated**.

### 1.3 Deadlines / team (stated)
Registration & idea 10 Jun–1 Jul 2026 · Explainer sessions 15–16 Jun · Shortlist 20 Jul · Induction 21 Jul · Grand Finale 6–7 Aug 2026 · II-AC travel reimbursed for finalists. **All elapsed as of 25 Oct 2026.**

---

## 2. Gaps, ambiguities and decisions

| # | Gap / ambiguity | Why it matters | Decision taken (proposed) |
|---|---|---|---|
| G1 | Steps are not numbered, yet the PS refers to "Step A", "Step 2", "Steps 1-3", "Step 4" | Cannot map to deliverables unambiguously | We number them: **Step 1** Frame interpolation, **Step 2** Visualisation, **Step 3** Report, **Step 4** INSAT-3DS application |
| G2 | Ratio inconsistency: INSAT 30→15→7.5 min vs. example GOES 20→10 min | GOES-19 full-disk is 10 min cadence (verify), so 00:00/00:20→00:10 means *skipping* an observed frame | Validation protocols P1–P4 (see doc 09) use held-out observed frames; 15→7.5 min is recursive and **qualitative only** |
| G3 | **No ground truth exists for INSAT at 15 min** | PS-09 output cannot be scored directly | P4: INSAT 60→30 min hold-out (real mid frame exists). Real 30→15 results judged qualitatively + temporal-consistency metrics, and clearly labelled |
| G4 | Himawari-8 listed, but Himawari-9 is the operational satellite and Himawari AWS data is JMA L1b (HSD), not `.nc` | PS-05/PS-06 conflict | Himawari = **optional** data source (stretch, via `satpy`); GOES-19 CMIP `.nc` is the primary training/validation source |
| G5 | "Input and output must be `.nc`" but MOSDAC delivers `.h5` | PS-06 | Ingest accepts `.nc` or `.h5`; a converter writes a canonical **FrameFill-NC** (CF-style) per frame/sequence; model I/O is always FrameFill-NC |
| G6 | GOES-19 (≈75°W) does not observe India; INSAT-3DS is at 82°E | Domain shift: viewing geometry, pixel size (≈2 km vs ≈4 km), spectral response | Treat as transfer problem; validate on INSAT P4; report the shift; no claim of equivalence |
| G7 | "FSIM" is defined for natural grey-scale images, not brightness temperature | PS-04 names it | Compute FSIM on BT scaled to [0,1] with a documented fixed range; report as supplementary, SSIM/MAE/RMSE primary |
| G8 | Which INSAT product level carries "TIR1 channel data" (L1B counts+LUT vs L1C gridded BT) | Loader design | Loader supports both; discovers variables at runtime; documented in doc 26 **[verify on a real file]** |
| G9 | ROI / spatial extent / number of frames unspecified | Compute and demo scope | Default ROI = 1024×1024 crop; optional full-frame tiling |
| G10 | Submission format/templates, judging weights, platform for finale not given | Document format | Our docs are internal engineering docs; adapt to templates once supplied |
| G11 | Whether the PS wants the *flow network itself* to be trained on satellite data, or a pretrained interpolator is acceptable | PS-13 says "preferably" | MVP-core = pretrained; MVP-plus = light fine-tune on satellite triplets (recommended because of PS-13) |
| G12 | MOSDAC account approval time unknown | Blocks PS-09 | Register on Day 1; request a small time window |

### Missing information to request from organisers (if possible)
1. Mandatory submission template(s). 2. Whether MOSDAC access is arranged for finalists. 3. Whether a 15-min INSAT reference product exists for scoring. 4. Compute provided at finale (GPU?). 5. Judging weights.

---

## 3. Technical approach evaluation (select the MVP)

| Option | Description | Pros | Cons / risks | Verdict |
|---|---|---|---|---|
| **B0 Linear temporal blend** | `0.5·I₀ + 0.5·I₁` | Trivial; the baseline every method must beat; blur reference | Ghosting; not "optical flow" | **Keep as mandatory baseline** |
| **B1 Classical optical flow + warp** (OpenCV DIS / Farneback; optional RAFT-small) | Flow(I₀→I₁), (I₁→I₀); backward-warp both to t; blend with occlusion-aware weights | Directly satisfies PS-01; interpretable motion vectors for the dashboard; no training | Fails with large displacements / cloud formation-dissipation; blur at edges | **Keep as classical baseline + flow visualiser** |
| **B2 Pretrained RIFE** (Practical-RIFE weights; arbitrary timestep) | Learned intermediate-flow + fusion network | Real-time-ish; arbitrary t (supports 15→7.5 recursion); suggested by PS | Trained on RGB video, 8-bit, small motions; behaviour on 1-channel BT is **unvalidated**; licence/weights provenance to check **[verify]** | **Primary candidate** after validation |
| **B3 RIFE + BT-aware pre/post-processing** | Fixed-range normalisation, polarity option, tiling, replicate to 3 channels, decode back to K | Cheap; may recover quality without training | Needs ablations | **MVP-core** |
| **B4 Fine-tuned RIFE on GOES-19 triplets** | Few-epoch fine-tune on satellite crops | Addresses PS-13; adapts to cloud texture/motion | Needs training code from the RIFE repository **[verify which repo has train.py]**; GPU time; overfitting to GOES geometry | **MVP-plus** (recommended; fallback is B3) |
| Super SloMo | Flow + refinement CNN | PS-suggested | Older; heavier training code; no obvious advantage | Optional comparison only |
| Large video diffusion / transformer interpolators | — | Possible quality | Hallucination risk for scientific data; heavy; unavailable weights | **Rejected** |
| Train from scratch | — | — | Data/compute/time | **Rejected** |

### 3.1 Is fine-tuning necessary?
Not to *produce* frames (pretrained inference works end-to-end), but **to defend the quality claim and honour PS-13** we plan one light fine-tune. The decision is gated by EXP results: fine-tune is adopted as the "best model" only if it beats B3 on the held-out test set under the protocol in doc 09. Otherwise B3 is declared best, and this is reported honestly.

### 3.2 Why not assume an RGB-video model transfers
Known mismatches (all to be tested, none assumed): 8-bit 3-channel inputs vs. float BT; small-motion training data vs. 6–18 px cloud displacement in 20 min; near-static background vs. video of moving objects; atmosphere-specific formation/dissipation (non-advective changes), which no flow model can represent.

### 3.3 Selected MVP

> **MVP-core (must ship):** M1 ingest (GOES-19 `.nc` + MOSDAC `.h5`) → M2 BT preprocessing → M3 engines {B0 blend, B1 DIS flow-warp, B2/B3 RIFE} → M4 FrameFill-NC writer → M5 evaluation (P1, P4 protocols; MAE/RMSE/PSNR/SSIM/FSIM + cloud masks) → M6 FastAPI → M7 React dashboard (animation, comparison, difference map, metrics) → M8 HTML report → INSAT-3DS 30→15 min animation.
> **MVP-plus (should ship):** B4 fine-tuned RIFE; recursive 15→7.5; experiment comparison screen; PDF export.
> **Optional:** Himawari via satpy; full-disk tiling; RAFT flow; Super SloMo comparison.

### 3.4 Dashboard (lightweight)
React + Vite + TypeScript front end; FastAPI back end; server-side colourised PNG frames; JS canvas player. Upload and metadata preview are included; **"fetch from AWS" is an optional convenience** — the guaranteed path is "use files already on disk".

---

## 4. Assumptions (all unverified until the stated check)

| ID | Assumption | Check |
|---|---|---|
| A1 | GOES-19 ABI-L2-CMIPF C13 full-disk files are available at 10-min cadence for the chosen dates | `aws s3 ls` listing, Week 1 |
| A2 | MOSDAC account will be approved within the project window | Register Day 1 |
| A3 | INSAT-3DS TIR1 at 30-min cadence for full disk/Asia sector is orderable | MOSDAC order test |
| A4 | A Colab/Kaggle-class GPU (≈16 GB) is obtainable for fine-tuning for a few hours | Benchmark; fallback = CPU-only B3 |
| A5 | RIFE code/weights licence permits our use (MIT-style, to be confirmed on the repo) | Read repo LICENSE, Week 1 |
| A6 | Team = 3–4 students with Python familiarity; at least one has used PyTorch | Skills survey |
| A7 | Foreign exchange for estimates ≈ ₹88/USD (assumption) | Update at purchase |

## 5. Unresolved questions

1. Do we need to keep separate 15-minute INSAT sector products (if they exist) as ground truth? 2. What ROI will judges find most meaningful (Bay of Bengal cyclone? Indian monsoon convection)? 3. Is a hosted public demo required, or is a local demo acceptable? 4. Is fine-tuned weight sharing permitted under the event's IP terms?
