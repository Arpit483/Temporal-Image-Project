# 02 — Requirements Analysis (Documents 9–14)

**Package version:** 0.1 Draft · **Date:** 2026-10-25 · Explicit PS items are `PS-xx`; everything else is a proposed design requirement.

---

## Doc 9 — Software Requirements Specification (SRS)
**Version 0.1 · Purpose:** Define what FrameFill shall do, to whom, under which constraints.

### 9.1 Scope
FrameFill ingests consecutive thermal-IR geostationary frames, produces temporally interpolated frames, stores them as `.nc`, visualises animations, and quantifies quality against held-out observed frames.

### 9.2 Users
| User | Goal |
|---|---|
| U1 Researcher/Judge | Inspect animations, metrics, limitations |
| U2 Student developer | Run pipeline/experiments, extend models |
| U3 Meteorologist (reviewer persona) | Judge physical plausibility of animation and difference maps |

### 9.3 Operating environment
Windows/Linux/macOS; Python 3.11; optional CUDA GPU; modern browser (Chromium/Firefox/Safari latest two versions). Local-first deployment (Docker Compose optional).

### 9.4 Interfaces
| Interface | Description |
|---|---|
| Files in | `.nc` (GOES-19 CMIP; FrameFill-NC) and `.h5` (INSAT) |
| Files out | FrameFill-NC `.nc`; PNG frames; GIF/MP4; CSV metrics; HTML/PDF report |
| REST API | `/api/v1/*` (Doc 23) |
| External | NOAA S3 (anonymous, optional); MOSDAC (user-supplied files or user's own credentials in `.env`, never committed) |

### 9.5 Constraints
No training from scratch; no paid services required; no redistribution of data; synthetic frames always flagged; BT stored in kelvin.

### 9.6 Assumptions & dependencies
See file 00 §4.

---

## Doc 10 — Functional and Non-Functional Requirements

### 10.1 Functional requirements
Priority: **M** = must (MVP-core), **S** = should (MVP-plus), **C** = could.

| ID | Requirement | Module | Pri | PS link |
|---|---|---|---|---|
| FR-01 | Accept upload or local path of `.nc`/`.h5` files; reject unsupported types with a clear error | M1,M6 | M | PS-05,06 |
| FR-02 | Fetch GOES-19 ABI-L2-CMIPF C13 files for a user-given UTC range from `s3://noaa-goes19` anonymously; optional | M1 | S | PS-05 |
| FR-03 | Load INSAT-3DS/3DR TIR1 from MOSDAC `.h5` (counts+LUT or BT variables) | M1,M2 | M | PS-05,09 |
| FR-04 | Extract metadata: satellite, channel, timestamps, grid shape, projection attrs, units; detect cadence and gaps; verify that consecutive frames share an identical grid | M2 | M | PS-06 |
| FR-05 | Convert to BT in K; build invalid-pixel mask (fill values, off-disk, NaN, out-of-range) | M2 | M | PS-04 |
| FR-06 | ROI crop (pixel or lat/lon if available), fixed-range normalisation, tiling with overlap blend | M2 | M | — |
| FR-07 | B0 linear blend engine | M3 | M | PS-04 |
| FR-08 | Flow estimation (DIS default; Farneback alternative; RAFT-small optional) returning forward/backward vectors and a flow visualisation | M3 | M | **PS-01** |
| FR-09 | B1 flow-warp interpolation using FR-08 | M3 | M | PS-01,02 |
| FR-10 | RIFE interpolation (pretrained B2/B3; fine-tuned B4 when available) | M3 | M | **PS-02** |
| FR-11 | Arbitrary timestep t∈(0,1) and recursive levels (×2, ×4) | M3 | M | PS-03 |
| FR-12 | Write FrameFill-NC with `frame_type` flag, interpolation fraction, provenance attrs; round-trip readable | M4 | M | **PS-06** |
| FR-13 | Asynchronous job execution with progress, cancel and persisted status | M6 | M | — |
| FR-14 | Evaluation: build held-out triplets (P1–P4); compute MAE, RMSE/MSE, PSNR, SSIM, FSIM, cold-cloud/dynamic-mask metrics, gradient & spectral metrics, flicker | M5 | M | **PS-04,08** |
| FR-15 | Baseline comparison table with skill score vs B0 | M5 | M | PS-04 |
| FR-16 | Generate report (HTML mandatory; PDF optional) with plots, config, versions, limitations | M8 | M | **PS-08** |
| FR-17 | Animation viewer: synchronised play/pause/step/speed/loop for original and interpolated sequences | M7 | M | **PS-07** |
| FR-18 | Ground-truth animation vs interpolated animation when GT exists for those timestamps | M7 | M | PS-07 |
| FR-19 | Frame comparison (side-by-side, slider) and difference map | M7 | M | PS-07,08 |
| FR-20 | Metrics view with per-frame and aggregate charts | M7 | M | PS-08 |
| FR-21 | Model/experiment comparison view | M7 | S | PS-04 |
| FR-22 | INSAT-3DS 30→15 min processing and animation | M3,M7 | M | **PS-09** |
| FR-23 | Export: `.nc`, PNG zip, GIF/MP4, CSV, report | M6,M8 | M | PS-06,08 |
| FR-24 | Persist config snapshot, git commit, seeds, library versions per job | M6 | M | — |
| FR-25 | Visibly label interpolated frames in UI and exports; include warning in NetCDF metadata | M4,M7 | M | — |
| FR-26 | CLI for batch pipeline (`framefill run|eval|report`) | all | S | — |
| FR-27 | Colour-map selection with colour-blind-safe default; fixed BT range controls | M7 | M | — |
| FR-28 | Recursive 15→7.5 output flagged "level 2 synthetic; not validated by ground truth" | M3,M7 | S | PS-03 |

### 10.2 Non-functional requirements
Targets are **proposed** and must be measured in doc 43 before being claimed.

| ID | Category | Requirement |
|---|---|---|
| NFR-01 | Performance | 1024×1024 ROI interpolation per frame: ≤ 30 s CPU, ≤ 2 s on a ≥ 8 GB GPU (to be benchmarked) |
| NFR-02 | Performance | Dashboard first paint ≤ 3 s on localhost; frame switch ≤ 100 ms after prefetch |
| NFR-03 | Scientific integrity | Interpolated values stay within [BT_min,BT_max] of source frames ± 5 K guard unless flagged; originals never overwritten |
| NFR-04 | Reproducibility | Same config + seed + data → identical output (CPU) / within 1e-4 relative (GPU) |
| NFR-05 | Portability | Install via `pip`/`conda` and Docker; Windows and Linux tested |
| NFR-06 | Reliability | Invalid inputs yield structured errors; job failure never corrupts dataset store |
| NFR-07 | Usability | New user completes an end-to-end run in ≤ 10 min using README |
| NFR-08 | Accessibility | WCAG 2.1 AA contrast; keyboard operable; colour-blind-safe palettes; reduced-motion respected |
| NFR-09 | Maintainability | Typed Python; core modules ≥ 70% line coverage (proposed); lint clean |
| NFR-10 | Security | Upload size cap (default 2 GB), file-type and path validation, no secrets in repo, CORS limited to localhost by default |
| NFR-11 | Observability | Structured logs per job; metrics persisted |
| NFR-12 | Licensing | Third-party licences listed; NOAA/MOSDAC attribution displayed |

---

## Doc 11 — Use Cases and User Stories

### 11.1 Use cases
| ID | Use case | Actor | Main flow | Alternate/Exception |
|---|---|---|---|---|
| UC-01 | Load dataset | U1/U2 | Upload files → metadata preview → validate | Mixed grids → error E-GRID; gap → warn |
| UC-02 | Run interpolation | U1/U2 | Choose dataset, method, level, ROI → submit → progress → result | GPU absent → CPU fallback notice; cancel |
| UC-03 | View animation | U1/U3 | Open result → play original & interpolated in sync | No GT → show only interpolated + notice |
| UC-04 | Validate vs ground truth | U1/U2 | Choose protocol (P1/P4) → run → metrics, difference map | Cadence insufficient → disable protocol with reason |
| UC-05 | Compare methods | U1/U2 | Select ≥2 experiments → table + charts | Experiments differ in test set → warning |
| UC-06 | Export | U1/U2 | Pick formats → download | Large export → background job |
| UC-07 | Apply to INSAT | U2 | Load INSAT `.h5` → 30→15 job → animation | Missing LUT → mapping error |
| UC-08 | Generate report | U1/U2 | Select job(s) → report build → download | Missing metrics → report states "not evaluated" |

### 11.2 User stories (acceptance criteria abbreviated)
| ID | Story | Acceptance |
|---|---|---|
| US-01 | As a judge, I want to see original and interpolated animations side by side so that I can assess smoothness | Playback synced within 1 frame; interpolated frames badge visible |
| US-02 | As a researcher, I want the interpolated frame compared with an observed frame so that I can trust the number | Metrics table shows protocol, N triplets, masks used |
| US-03 | As a meteorologist, I want a difference map in kelvin so that I can see where errors cluster | Diverging map symmetric around 0; colourbar in K |
| US-04 | As a developer, I want to change the model via a config so that I can run ablations | `framefill run --config x.yaml` reproduces EXP |
| US-05 | As a judge, I want the INSAT-3DS animation at 15 min so that I see the end goal | Animation plays; caveat banner shown |
| US-06 | As a user, I want exported `.nc` to open in standard tools | `ncdump -h` and xarray open without error; CF attrs present |

---

## Doc 12 — Requirements Traceability Matrix (RTM, initial)
**Purpose:** Link PS → FR → module → test → design doc. Final status matrix is in file 11.

| PS | FR | Module | Test cases | Design doc |
|---|---|---|---|---|
| PS-01 | FR-08,09 | M3 | TC-020–023 | 21 |
| PS-02 | FR-10,11 | M3 | TC-024–029 | 21 |
| PS-03 | FR-11,22,28 | M3 | TC-027,028,060 | 21 |
| PS-04 | FR-07,14,15 | M5 | TC-030–041 | 09,42 |
| PS-05 | FR-01–03 | M1 | TC-001–010 | 26,27 |
| PS-06 | FR-01,12 | M1,M4 | TC-005,011–015 | 22 |
| PS-07 | FR-17–19 | M7 | TC-050–055 | 24 |
| PS-08 | FR-14,16,20 | M5,M8 | TC-040–045,056 | 42,09 |
| PS-09 | FR-22 | M3,M7 | TC-060–062 | 20,40 |
| PS-10 | FR-17 | M7 | TC-050 | 25 |
| PS-11 | FR-14,17 | M5,M7 | TC-030–055 | 24,42 |
| PS-12 | FR-10 | M3 | TC-024 | 31 |
| PS-13 | FR-10 (B4) | M3 | TC-029 | 29 |
| PS-14 | FR-14,22 | M5 | TC-032,060 | 09 |

---

## Doc 13 — Data Requirements Specification
**Purpose:** Specify the data the system needs, with checks.

| ID | Requirement |
|---|---|
| DR-01 | Training/validation data: GOES-19 ABI Ch13 (≈10.3 µm) BT, full-disk 10-min cadence; ≥ 7 contiguous days for train and ≥ 2 separate days (different weather regime) for validation and ≥ 2 more for test. No day shared across splits |
| DR-02 | Split by **day**, never by random frame, to avoid temporal leakage |
| DR-03 | Optional: Himawari-9/8 B13 (≈10.4 µm) over Bay of Bengal/Indian Ocean–facing sectors to reduce geography shift |
| DR-04 | INSAT-3DS (and/or 3DR) TIR1 (≈10.8 µm) at 30-min cadence; ≥ 2 days incl. at least one convective-cloud-rich day; sufficient for P4 (need triplets 60 min apart) |
| DR-05 | Each frame: valid timestamp (UTC), consistent grid, BT units K, identifiable fill values |
| DR-06 | Consecutive frames must share identical grid/projection; else reject (no silent resampling) |
| DR-07 | Missing frames handled explicitly: gaps > 1.5× nominal cadence break sequences |
| DR-08 | Sensor-specific facts (resolution, calibration) recorded in metadata, not assumed **[verify spec per sensor]** |
| DR-09 | Storage: raw files read-only; derived crops in `data/derived/`; manifests with SHA-256 |
| DR-10 | Licence/attribution text stored with each dataset record |

Approximate volumes (**estimates, verify**): GOES-19 CMIPF C13 full disk ≈ 10–40 MB/file → 144 files/day ≈ 1.5–6 GB/day; keep only ROI crops (1024² float16 ≈ 2 MB) after download.

---

## Doc 14 — Literature Review & Existing Methods Comparison
**Purpose:** Place the work in context. *Citations below are well-known works listed from memory; confirm bibliographic details before submission.* No benchmark numbers are reproduced here.

| Method / work | Idea | Relevance | Limitation for satellite BT |
|---|---|---|---|
| Horn–Schunck (1981), Lucas–Kanade (1981) | Classical differential optical flow | Basis of cloud-motion vectors historically | Smoothness assumptions; fails on large motion |
| Farnebäck (2003) | Polynomial-expansion dense flow (OpenCV) | Easy baseline | Blur at boundaries |
| DIS optical flow (Kroeger et al., 2016) | Fast dense inverse search | Real-time classical flow in OpenCV | Large displacement errors |
| FlowNet / PWC-Net / RAFT (Teed & Deng, 2020) | Learned optical flow | Strong flow; torchvision ships RAFT | Trained on RGB synthetic/real scenes |
| Super SloMo (Jiang et al., 2018) | Bidirectional flow + refinement for arbitrary-t interpolation | PS-suggested | Older; flow approximation errors |
| DAIN (Bao et al., 2019) | Depth-aware flow projection | Occlusion handling | Heavy |
| RIFE (Huang et al., 2022) | Direct intermediate-flow estimation (IFNet) + privileged distillation; arbitrary t | PS-suggested; fast | Video-trained; unvalidated on BT |
| FILM (Reda et al., 2022) | Large-motion interpolation | Handles large displacement | Heavier; weights/licence check |
| AMT / EMA-VFI / IFRNet | Newer efficient interpolators | Alternatives if RIFE underperforms | Setup effort |
| Meteorological nowcasting with deep learning (e.g., Shi et al. ConvLSTM 2015; DGMR, Ravuri et al. 2021) | Predict future radar/satellite | Related but **extrapolation**, not interpolation | Different task |
| Satellite frame interpolation/“tweening” literature for GOES/Himawari | Reported by several groups | Direct precedent | **[search and confirm before citing specific papers]** |

**Positioning:** We reuse an established interpolator and contribute adaptation + validation methodology; we do not claim algorithmic novelty.
