# 11 — Consistency Audit, Final Traceability Matrix and Checklists (Phase 7)

**Version 0.1 · 2026-10-25 · Purpose:** Verify the package is internally consistent, show what was found and fixed, list what remains unverified, and give final checklists.
**Status vocabulary:** *Designed* = specified in documents only. *Not implemented / Not tested* is true for every item; no code, experiment or test exists yet.

---

## 1. Audit checks

| # | Check | Result | Notes |
|---|---|---|---|
| 1 | Every mandatory PS requirement addressed | **Pass** | PS-01…PS-14 map to FR/modules (matrix §3). PS-15 (eligibility/admin) is informational |
| 2 | Each requirement → module → test | **Pass (design level)** | RTM Doc 12 and §3; tests TC-001…TC-065 exist as designs |
| 3 | Architecture matches algorithms/pipeline | **Pass** | M3 engines (blend, flow_warp, rife) = Doc 21 = Doc 20 steps P7/P8 |
| 4 | Software stack compatible with selected model | **Pass with caveat** | PyTorch/OpenCV combos standard; exact RIFE repo/torch versions unverified → freeze after first run (Doc 36) |
| 5 | Budget matches resources | **Pass** | Doc 08 scenarios consistent with Doc 01 §8; effort 340 h = 4 × 85 h |
| 6 | Timeline realistic | **Pass with caveat** | 340 h in 5 weeks assumes ≈17 h/week/person; cut order defined (Doc 04) |
| 7 | Evaluation supports claims | **Pass** | Claims policy (Doc 09 §7); GT only for P1/P2/P4; INSAT 15/7.5 min qualitative |
| 8 | UI reflects system capabilities | **Fixed** | See issue I-1, I-2; functional vs visual-only in Doc 10 Part E |
| 9 | Risks/limitations acknowledged | **Pass** | Doc 07 risk register; Model Card; Doc 09 §4 |
| 10 | No feature depends on unverified resource without fallback | **Pass** | Each unverified item has a fallback (table §2) |

### Issues found during the audit and what was done
| ID | Issue | Resolution |
|---|---|---|
| I-1 | UI Screen S1 requires a jobs list but Doc 23 had no `GET /jobs` | **Added** `GET /jobs` to Doc 23 |
| I-2 | Doc 50 described difference maps as red/blue, Doc 10 uses colour-blind-safer blue/orange | **Doc 50 corrected** to blue/orange |
| I-3 | PS says models "preferably" trained on satellite data (PS-13); initial MVP treated fine-tuning as optional | Fine-tuning kept as **MVP-plus (recommended)** with pre-registered adoption rule and fallback (Docs 00, 29, 31) |
| I-4 | PS dates have elapsed (Registration Closed; finale 6–7 Aug 2026) | All plans date-agnostic; risk R-13; README §0 |
| I-5 | DIS optical flow requires 8-bit input, risking quantisation of BT | Flow estimated on scaled 8-bit copy **only**; warping on float32 BT (Doc 17.2) |
| I-6 | PS example (00:00, 00:20 → 00:10) implies skipping an observed GOES frame | Protocol P1 explicitly defined; documented in G2 |
| I-7 | No ground truth for INSAT 15 min | P4 (60→30) + Q1 qualitative; claims policy |

---

## 2. Remaining unverified items (must be checked before they are relied on)

| Item | Where used | Check | Fallback |
|---|---|---|---|
| GOES-19 C13 full-disk cadence is 10 min; CMIPF file naming/variable `CMI` | Docs 20,26,27 | `aws s3 ls`; open a file | L1b-Rad path; adjust cadence |
| P2 data source (5-min sector or Himawari 2.5-min regional) | Doc 09 | Browse bucket | Drop P2 |
| INSAT-3DS L1B/L1C TIR1 variable names, LUT, grid/projection metadata | Docs 20,27,28 | `framefill inspect` on a real file | Mapping config; manual |
| 15-min INSAT product existence | PS-09/G3 | MOSDAC catalog | Use P4 only |
| Himawari-8 vs -9 availability and HSD→NC route | D3 | satpy test | Skip Himawari |
| RIFE repo choice, licence, availability of training code | Docs 21,29 | Read repos | Other open interpolator or B1/B3 only |
| FSIM implementation choice | Docs 09,25 | Unit test (TC-034) | Own implementation |
| Free-tier GPU quotas; Colab/Kaggle policies | Doc 08 | Provider pages | CPU-only |
| Prices in INR | Doc 08 | Provider pages | Re-estimate |
| Google Stitch availability/limits | Doc 10 | Try | Hand-code React with same tokens |
| NFR performance targets | Doc 10 NFR-01/02 | Benchmarks (Doc 43) | Revise targets with real numbers |
| MOSDAC approval turnaround | A2 | Register | Fallback in R-01 |

---

## 3. Final Requirements Traceability Matrix

All statuses are **Designed — not implemented, not tested** until updated by the team.

| Req ID | PS requirement | Implementing module | Verification method | Associated documents | Status |
|---|---|---|---|---|---|
| PS-01 | Optical-flow model estimating motion vectors | M3 `flow_warp`, `flowviz` | TC-020–023; synthetic known-flow test | 17, 21, 31 | Designed |
| PS-02 | DL-based synthetic intermediate frames | M3 `rife` | TC-024–029; P1 evaluation | 21, 29, 32 | Designed |
| PS-03 | Higher temporal resolution (30→15→7.5 or equivalent) | M3 `recursive`, M4 | TC-027, 028, 060; P3/Q1 | 17, 21, 09 | Designed |
| PS-04 | Validate vs real high-cadence data using SSIM, MSE, PSNR, FSIM | M5 | TC-030–041; EXP-01…EXP-13 | 09, 30, 42 | Designed |
| PS-05 | Thermal-IR ~10 µm from GOES-19, INSAT-3DS/3DR, Himawari-8 | M1, M2 | TC-001–010, TC-017 | 13, 26, 27 | Designed (Himawari optional) |
| PS-06 | `.nc`/`.h5` inputs; `.nc` model in/out | M1, M4 | TC-005, 011–015 | 22, 20 | Designed |
| PS-07 | Dashboard: original vs interpolated animations, GT and interpolated | M7, M6 | TC-050–054 | 24, 10, 23 | Designed |
| PS-08 | Report vs GT with metrics and plots; other cloud-suitable metrics | M5, M8 | TC-040–045, 056 | 09, 42 | Designed |
| PS-09 | Apply to INSAT-3DR/3DS; 15-min animations | M1–M4, M7 | TC-060–062; P4; Q1 | 20, 26, 09 | Designed (data access risk R-01) |
| PS-10 | Web technologies for visualisation | M7 | TC-050; build check | 25, 10 | Designed |
| PS-11 | Evaluation on MSE/PSNR/other, Web GUI design, INSAT visual quality | M5, M7 | TC-030–044, 055 | 09, 10, 42 | Designed |
| PS-12 | Suggested Super SloMo/RIFE (guidance) | M3 | TC-024 | 21, 31 | Designed (RIFE primary; Super SloMo optional) |
| PS-13 | Preferably models trained on satellite data | M3 B4, training plan | TC-029; EXP-11/12 | 29, 31 | Designed (MVP-plus) |
| PS-14 | Steps 1–3 on GOES-19 (e.g. 00:00 & 00:20 → 00:10); Step 4 on INSAT-3DS | M5, M3 | TC-032, TC-060 | 09 | Designed |
| PS-15 | Eligibility/admin (students, 3–4 members, India) | — | Team checklist | 01 | Informational |
| FR-01…FR-28 | (see Doc 10 in `02_Requirements_Analysis.md`) | per FR table | TC mapping in Doc 12/40 | 02, 06 | Designed |
| NFR-01…NFR-12 | Proposed non-functional | cross-cutting | Benchmarks / TC-055, 063–065 | 06 | Designed |

---

## 4. Consolidated resource checklist

**Accounts and access**
- [ ] MOSDAC account created and approved (R-01) · [ ] `aws s3 ls --no-sign-request s3://noaa-goes19/` works · [ ] GitHub repo · [ ] Colab/Kaggle account(s) · [ ] Google Stitch access
**Hardware/software**
- [ ] 4 machines with Python 3.11, Git, Node 20 · [ ] Docker (optional) · [ ] ≥ 100 GB free transient disk or Colab-side cropping
**Data**
- [ ] GOES-19 train/val/test days chosen *before* results (Doc 26.2) · [ ] ROI fixed · [ ] INSAT sample ≥ 2 days · [ ] manifests with SHA-256
**Models**
- [ ] RIFE licence read · [ ] weights downloaded + checksums · [ ] fine-tune code identified (MVP-plus)
**Docs/tools**
- [ ] Templates from organisers (if any) · [ ] Mermaid rendering · [ ] OBS for demo video

---

## 5. Implementation roadmap

| Phase | Weeks | Deliverables | Gate |
|---|---|---|---|
| 0 Setup | 1 | Repo, CI, environments, MOSDAC registration, S3 listing | MS-1 |
| 1 Data & baselines | 1–2 | M1/M2/M4, B0, B1, first metrics | MS-2, go/no-go |
| 2 Learned engine | 2–3 | RIFE wrapper, EXP-04…EXP-10 | Best-on-val chosen |
| 3 Fine-tune (MVP-plus) | 3–4 | EXP-11/12; model card | MS-4 |
| 4 App | 3–4 | API, dashboard S1–S6 | MS-5 |
| 5 INSAT & report | 4 | INSAT 30→15, P4, report | MS-6 |
| 6 Hardening | 5 | Tests, UAT, docs, demo video | MS-7 / `v1.0.0` |

---

## 6. Final submission checklist
*(Adapt to the organiser's exact requirements; PS FAQ says the idea phase requires a concept proposal "as per the provided templates", which were not available.)*

**Content**
- [ ] Concept/proposal in the required template (Doc 1 content as source) · [ ] Final report (Doc 54) · [ ] Model card · [ ] User manual · [ ] Evaluation report with N, CI, protocols
**Technical**
- [ ] Source code tagged `v1.0.0` · [ ] README with ≤10-minute quick start · [ ] Offline demo bundle (sample data, weights, results) · [ ] `.nc` sample outputs opening in standard tools · [ ] Dashboard demo + 3-min backup video
**Integrity**
- [ ] Every number traced to an EXP ID · [ ] "Demonstrated vs targeted" table · [ ] INSAT limitations stated · [ ] Synthetic labelling present in UI and files · [ ] Data/model attribution and licences
**Administrative**
- [ ] Team details (3–4 students, institutions) · [ ] Confirm eligibility/dates with organisers (the PS calendar has elapsed) · [ ] No secrets in repo · [ ] Final retrospective recorded (Doc 55)
