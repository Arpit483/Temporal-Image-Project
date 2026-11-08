# 06 — Testing and Validation (Documents 38–45)

**Package version:** 0.1 Draft · **Date:** 2026-10-25 · No test has been executed; "Status" columns start as **Not run**.

---

## Doc 38 — Test Strategy
**Purpose:** Overall approach, levels, tooling and exit criteria.

| Principle | Detail |
|---|---|
| Risk-based | Heaviest testing on data correctness (BT, masks, grids), NetCDF I/O, metrics correctness, and honest labelling |
| Pyramid | Many unit tests (pytest, tiny synthetic fixtures) → integration (pipeline on 3–5 real frames) → system (API + UI smoke) → acceptance (UAT) |
| Test data | (a) synthetic: moving Gaussian blobs/shifted fields with known flow and BT; (b) 5–10 real GOES-19 crops; (c) 3–4 real INSAT frames if obtained |
| Oracles | Known-flow synthetic data (shift by exactly Δ px ⇒ analytic mid-frame); identity checks; round-trip I/O; independent metric implementations (skimage vs. manual) |
| Scientific validation | Separate from software testing → Doc 09/42 |
| Automation | CI on every PR: lint, unit, integration (CPU, small), frontend type-check/build; nightly/manual: GPU benchmarks |
| Exit criteria | All Must test cases pass; no open Critical/High defects; coverage target (NFR-09) met or deviations justified; UAT sign-off by 2 reviewers |
| Environments | `ci` (CPU), `dev`, `demo` |

---

## Doc 39 — Test Plan
**Purpose:** What, when, who, how much.

| Item | Plan |
|---|---|
| Scope | Modules M1–M8 and PS requirements in RTM |
| Out of scope | Load testing beyond a single user; penetration testing; cross-browser beyond Chromium+Firefox |
| Schedule | Unit tests with each module (Weeks 1–3); integration Week 3–4; system/UAT Week 5 |
| Roles | R3 owns plan; each developer owns unit tests of their module; R4 runs UAT sessions |
| Entry criteria | Build green on CI; test data available |
| Suspension | Blocker defects in data loading or NC writer |
| Reporting | Test summary table in the final report; defect log (Doc 44) |

---

## Doc 40 — Detailed Test Cases and Scenarios
Priority: **H**/M/L. *Status all "Not run".* Req = FR/PS link.

### 40.1 Ingest and preprocessing (M1, M2)
| TC | Scenario | Steps | Expected | Req | Pri |
|---|---|---|---|---|---|
| TC-001 | Open valid GOES-19 C13 `.nc` | `load_frame(path)` | Meta: satellite=GOES-19, channel=C13, tz-aware UTC time, shape correct | FR-01,04 | H |
| TC-002 | Open INSAT `.h5` | `load_frame(path)` | TIR1 located via config mapping; BT within 150–350 K after LUT | FR-03 | H |
| TC-003 | Unsupported file (`.txt`, `.tif`) | upload | `E-FORMAT` 400, no partial dataset | FR-01 | H |
| TC-004 | Corrupt/truncated NC | load | `E-FORMAT`, job not created | FR-01 | M |
| TC-005 | `.h5` → FrameFill-NC conversion | convert | Output passes validator; BT unchanged within 1e-3 K | FR-12 / PS-06 | H |
| TC-006 | Cadence detection | 10 frames @10 min | cadence=10; gaps=[] | FR-04 | H |
| TC-007 | Gap handling | remove 1 frame | sequence split; warning `E-GAP` | FR-04 | H |
| TC-008 | Grid mismatch | frames from two sectors | `E-GRID`; no silent resample | FR-04 | H |
| TC-009 | Invalid pixel mask | file with fill values | NaN in BT; `valid` correct | FR-05 | H |
| TC-010 | Normalisation fixed range | two frames | Same constants applied; round-trip error ≤1e-4 K | FR-06 | H |
| TC-016 | Tiling seams | blend engine on tiled vs untiled | Max abs diff ≤ 1e-4 (K-equivalent) | FR-06 | M |
| TC-017 | Optional S3 fetch (needs network) | fetch 3 frames | Files exist; manifest + SHA-256 | FR-02 | L |

### 40.2 NetCDF I/O (M4)
| TC | Scenario | Expected | Req | Pri |
|---|---|---|---|---|
| TC-011 | Write FrameFill-NC | `ncdump -h`; CF attrs; units K | FR-12 | H |
| TC-012 | Round trip | read→write→read equals within 1e-6 | FR-12 | H |
| TC-013 | `frame_type` integrity | observed=0, synthetic=1/2; no synthetic at observed timestamps | FR-12,25 | H |
| TC-014 | Warning attribute present | global `warning` set | FR-25 | H |
| TC-015 | Opens in xarray and another tool (e.g., Panoply/ncview) | no error | PS-06 | M |

### 40.3 Engines (M3)
| TC | Scenario | Expected | Req | Pri |
|---|---|---|---|---|
| TC-020 | DIS flow on synthetic shift of 8 px | median endpoint error ≤ 1 px in textured region | FR-08 | H |
| TC-021 | Flow fwd/bwd consistency | Mean fb-error below threshold on synthetic | FR-08 | M |
| TC-022 | Flow-warp mid-frame on synthetic shift | MAE ≤ X K (set after pilot) and < B0 MAE | FR-09 | H |
| TC-023 | Flow visualisation | PNG produced; legend scale in px/frame | FR-08 | M |
| TC-024 | RIFE loads weights, runs on 256² random crop | output shape, no NaN, range [0,1] | FR-10 | H |
| TC-025 | RIFE identity: t=0 and t=1 | output ≈ inputs (tolerance documented) | FR-10 | M |
| TC-026 | Tiling parity for RIFE | no visible seam; edge metric below threshold | FR-06,10 | M |
| TC-027 | Recursive level 2 | frame count = 4N−3 for N observed; flags=2 on new frames | FR-11,28 | H |
| TC-028 | Arbitrary t ∈ {0.25,0.5,0.75} | ordered monotone timestamps | FR-11 | M |
| TC-029 | Fine-tuned weights load & smoke inference | loads; output valid | FR-10 | M |
| TC-018 | NaN/invalid propagation | invalid in either input ⇒ invalid in output | FR-05,07 | H |
| TC-019 | Device fallback | no CUDA ⇒ CPU + warning, same API | NFR-05 | M |

### 40.4 Evaluation and report (M5, M8)
| TC | Scenario | Expected | Req | Pri |
|---|---|---|---|---|
| TC-030 | MAE/RMSE vs hand computation | match to 1e-6 | FR-14 | H |
| TC-031 | PSNR with fixed data_range=150 K | equals formula; documented | FR-14 | H |
| TC-032 | P1 triplet builder (Δ=10, t=+10 from 20-min pair) | correct timestamps, GT index | FR-14 | H |
| TC-033 | SSIM equals skimage on valid-only window mask | within 1e-6 | FR-14 | H |
| TC-034 | FSIM implementation sanity (identical images=1) | =1; decreases with noise | FR-14 | M |
| TC-035 | Dynamic mask definition | pixels with smoothed `|Δ|>3 K` only | FR-14 | H |
| TC-036 | Cold mask `<235 K` | correct | FR-14 | M |
| TC-037 | Spectral ratio on blurred image | hf_ratio < 1 | FR-14 | M |
| TC-038 | Flicker metric on constant/linear sequence | 0 for linear in time | FR-14 | M |
| TC-039 | Paired bootstrap | CI contains true mean on synthetic | FR-15 | M |
| TC-040 | Report builds | HTML opens; sections present; config embedded | FR-16 | H |
| TC-041 | Baseline comparison table | B0,B1,B3(,B4) rows; skill score | FR-15 | H |
| TC-042 | Report states "not evaluated" for missing GT | text present | FR-16 | M |
| TC-043 | Report limitations section present | yes | FR-16,25 | H |
| TC-044 | Visual QA checklist on 20 random triplets (ghosting, seams, texture hallucination, BT drift) | all items recorded | PS-11 | H |
| TC-045 | Metrics persisted to DB and CSV identical | equal | FR-20 | M |

### 40.5 API and UI (M6, M7)
| TC | Scenario | Expected | Req | Pri |
|---|---|---|---|---|
| TC-046 | `POST /jobs` valid | 202 + job_id; progress reaches 1.0 | FR-13 | H |
| TC-047 | Invalid job body | 422 with field errors | FR-13 | M |
| TC-048 | Cancel running job | status Cancelled within 10 s; no partial outputs listed | FR-13 | M |
| TC-049 | Upload size > limit | `E-LIMIT` | NFR-10 | M |
| TC-050 | Viewer plays synchronised sequences | desync ≤ 1 frame over 60 s | FR-17 | H |
| TC-051 | Badge shows OBSERVED vs SYNTHETIC | correct per frame | FR-25 | H |
| TC-052 | GT vs interpolated animation (when GT) | both sequences aligned | FR-18 | H |
| TC-053 | Slider compare + diff map symmetrical colour scale | yes | FR-19 | H |
| TC-054 | Metrics charts render with N, masks listed | yes | FR-20 | H |
| TC-055 | Keyboard operation, focus order, contrast (axe/Lighthouse) | no critical a11y issues | NFR-08 | M |
| TC-056 | Export buttons call correct API and download | files valid | FR-23 | H |
| TC-057 | Empty/loading/error states visible per screen | yes | UI | M |
| TC-058 | Responsive at 360, 768, 1440 px | no overflow; controls reachable | NFR-08 | M |

### 40.6 INSAT application and system
| TC | Scenario | Expected | Req | Pri |
|---|---|---|---|---|
| TC-060 | INSAT 30→15 run | 2N−1 frames; synthetic flagged; animation plays | FR-22 | H |
| TC-061 | INSAT P4 60→30 hold-out | metrics produced with N triplets | FR-14,22 | H |
| TC-062 | Caveat banner on INSAT results | visible | FR-25 | H |
| TC-063 | End-to-end on clean machine following README | completes ≤ 10 min of effort | NFR-07 | H |
| TC-064 | Reproducibility: same config+seed twice | outputs identical (CPU) | NFR-04 | M |
| TC-065 | Docker Compose up | API+web reachable | NFR-05 | M |

---

## Doc 41 — Unit, Integration and System Testing Plan

| Level | Targets | Tooling | Gate |
|---|---|---|---|
| Unit | functions in `preprocess`, `engines`, `io`, `eval`, `api.schemas` | pytest, numpy testing, hypothesis (optional) | PR merge |
| Integration | ingest→preprocess→engine→NC→eval on 5 real crops; API + SQLite | pytest + FastAPI TestClient | PR merge (small), nightly (full) |
| System | UI + API + worker via Docker Compose | Playwright smoke (upload, run, play, metrics, export) | Pre-release |
| Regression | Golden-file metrics for fixed synthetic triplets | pytest with tolerance | PR merge |
| Non-functional | Performance (Doc 43), accessibility (axe), security checks (upload validation) | scripts | Pre-release |

---

## Doc 42 — Model Validation and Metrics Report Template
**Purpose:** Fill-in template for the evaluation report (PS-08). *All values blank until measured.*

1. **Summary** — best model, protocol(s), N, headline result *with CI*; one-sentence limitation.
2. **Setup** — dates, ROI, split rules, masks, normalisation range, engine configs (link EXP IDs), hardware, versions.
3. **Quantitative results (ground truth available)**

| Engine | Protocol | N | MAE (K) | RMSE (K) | PSNR (dB)* | SSIM | FSIM | MAE dyn (K) | MAE cold (K) | skill vs B0 |
|---|---|---|---|---|---|---|---|---|---|---|
| B0 | P1 | | | | | | | | | 0 |
| B1-DIS | P1 | | | | | | | | | |
| B3 | P1 | | | | | | | | | |
| B4 | P1 | | | | | | | | | |
*PSNR with fixed 150 K range.

4. **Plots** — per-triplet error distributions (box/violin), error vs displacement magnitude, error vs time-of-day, scatter pred-vs-GT BT, histogram of BT differences, radial power spectra, difference maps for best/median/worst cases.
5. **Statistical tests** — paired bootstrap CIs for model − baseline differences.
6. **Domain-shift study** — GOES vs INSAT P4 table.
7. **Temporal consistency** — flicker metric on full sequences, cycle consistency (L2 vs observed where available).
8. **Qualitative review** — 20-triplet checklist results (TC-044) + meteorologist/mentor comments (if any).
9. **Failure analysis** — categories (fast motion, formation/dissipation, edges, invalid regions).
10. **Demonstrated vs targeted** — table separating achieved vs proposed targets.
11. **Reproducibility** — commit, configs, seeds, command lines.

---

## Doc 43 — Performance Benchmarking Plan

| Benchmark | Method | Reported |
|---|---|---|
| Throughput per engine | 100 pairs at 512², 1024², 2048² (tiled) | frames/s, p50/p95 latency |
| Hardware | each available CPU/GPU | device, RAM, VRAM peak |
| Memory | peak RSS and VRAM | MB |
| Scaling | vs ROI size and `scale` parameter | curve |
| I/O | NC read/write per frame | ms and MB |
| API | job submit→complete for 20 frames; dashboard frame fetch p95 | s / ms |
| Warm-up | exclude first run | — |
Compare against NFR-01/02 targets; if missed, record the real numbers and revise targets (do not hide).

---

## Doc 44 — Defect Tracking Process

| Item | Definition |
|---|---|
| Tool | GitHub Issues with labels |
| Severity | **Critical** (data corruption, false BT, crash in core flow) · **High** (feature unusable, wrong metric) · **Medium** · **Low** |
| Fields | ID, title, severity, module, steps, expected/actual, logs, commit, owner, status |
| Workflow | New → Triaged → In progress → In review → Verified → Closed (or Won't fix with reason) |
| SLA (team) | Critical: same day; High: 2 days |
| Metrics | Open by severity; mean time to fix; escaped defects found in UAT |
| Regression rule | Every fixed High/Critical defect gets a test |

Template: `DEF-001 | Severity | Module | Summary | Steps | Expected | Actual | Status | Owner | Fixed in`.

---

## Doc 45 — User Acceptance Testing Plan

| Item | Plan |
|---|---|
| Participants | ≥ 2 reviewers not on the core dev path (faculty/mentor/peer); optionally one with meteorology background |
| Environment | Clean machine/browser; README only |
| Scenarios | UAT-1 load sample dataset; UAT-2 run B3 on sample; UAT-3 watch synced animation; UAT-4 find worst-case triplet and view difference map; UAT-5 export `.nc` and open in a standard tool; UAT-6 generate report; UAT-7 view INSAT result and read caveats |
| Acceptance criteria | Each scenario completed without developer help; participants correctly identify observed vs synthetic frames; no Critical/High defects; SUS-style usability questions average ≥ 4/5 (proposed) |
| Feedback capture | Form + screen notes → Change Request log (Doc 53) |
| Sign-off | Names/dates recorded in the final report. *Not pre-filled.* |
