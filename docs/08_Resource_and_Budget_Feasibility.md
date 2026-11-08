# 08 — Resource and Budget Feasibility (Phase 4)

**Version 0.1 · 2026-10-25 · Purpose:** List every resource with spec, necessity, cost (INR), alternatives, and three budget scenarios.
**Labels:** *Verified* = confirmed on an official page on 25 Oct 2026 during preparation. *Estimate* = rough market/experience figure, must be re-checked. *Assumption* = planning input. Exchange-rate assumption ₹88/USD (A7). **No paid cloud credits, dedicated GPU or unrestricted dataset access is assumed.**

---

## 1. Hardware and compute

| # | Resource | Purpose | Spec & qty | Status | Free/OSS? | Cost (INR) | One-time / recurring | Compatibility / install | Alternative |
|---|---|---|---|---|---|---|---|---|---|
| H1 | Developer laptops/desktops | Dev, CPU inference, UI | ≥ 4-core CPU, 16 GB RAM (8 GB workable with small ROIs), 50 GB free SSD; ×4 | Mandatory | Existing | ₹0 (owned) | — | Windows/Linux/macOS; WSL2 on Windows | University lab PCs |
| H2 | Free-tier GPU (Colab / Kaggle) | Fine-tune, batch eval | ≈ 16 GB VRAM class GPU, session-limited; ×1 session at a time | Optional (needed for B4) | Free tiers *(quotas, GPU type and weekly limits change — verify)* | ₹0 | Recurring availability | Linux, CUDA preinstalled; checkpoint/resume needed | University GPU server; CPU-only (skip B4) |
| H3 | Paid GPU access (Colab Pro-type subscription) | More reliable sessions | 1 month, 1 account | Optional | No | ≈ ₹1,000–1,300 *(estimate; verify current plan price)* | Recurring (monthly) | Same as H2 | Kaggle + local |
| H4 | Rented cloud GPU | Larger fine-tune/ablation sweep | e.g. 24 GB-class GPU, ≈ 50–100 h | Optional (scenario 3) | No | ≈ ₹25–70/h → ₹1,500–7,000 *(estimate)* | Pay-per-use | Docker/SSH; copy data in | H2/H3 |
| H5 | External SSD | Raw data + crops safekeeping | 500 GB–1 TB USB 3 ×1 | Optional | No | ≈ ₹4,000–7,000 *(estimate)* | One-time | exFAT/NTFS | Cloud drive; delete full-disk files after cropping |
| H6 | Internet | Downloads (GOES S3, MOSDAC SFTP) | ≥ 10 Mbps, ~100 GB total transient | Mandatory | Existing | ₹0 incremental | — | S3 bucket in us-east-1 (slower from India) → run downloads in Colab | Campus network |

## 2. Data

| # | Resource | Purpose | Spec | Mandatory? | Free? | Cost | Notes / alternative |
|---|---|---|---|---|---|---|---|
| D1 | GOES-19 ABI C13 (NOAA S3) | Train/val/test | ≈ 11 days × 144 frames; anonymous access, no AWS account (verified) | Mandatory | Yes | ₹0 | Google Cloud mirror `gcp-public-data-goes-19` (listed in NOAA catalog metadata); fall back to fewer days |
| D2 | INSAT-3DS/3DR TIR1 (MOSDAC) | PS-09; P4 | ≥ 2 days at 30 min; account approval needed; free for non-commercial use; 5,000 files/day API limit (verified) | Mandatory for PS-09 | Yes | ₹0 | If denied: mark INSAT part "not demonstrated"; use Himawari/GOES only |
| D3 | Himawari-8/9 (NOAA S3) | Optional extra data | Needs `satpy` for HSD; attribution to JMA/NOAA | Optional | Yes | ₹0 | Skip if time-limited |
| D4 | Storage for crops/outputs | Derived data | ≈ 3–10 GB crops + outputs | Mandatory | Local disk | ₹0 | H5 |

## 3. Software and models

| # | Resource | Purpose | Free/OSS? | Cost | Notes |
|---|---|---|---|---|---|
| S1 | Python 3.11, NumPy, SciPy, xarray, netCDF4/h5py, OpenCV, scikit-image | Core | OSS | ₹0 | Pin after first green run |
| S2 | PyTorch + torchvision (RAFT optional) | DL | OSS (BSD-style) | ₹0 | Choose CPU or CUDA wheel |
| S3 | RIFE code and pretrained weights | Interpolation | Upstream repositories are published with an open licence, **to be confirmed by reading LICENSE/weights terms (A5)** | ₹0 | Fallback: other open interpolators (e.g., IFRNet/AMT) or B1-only |
| S4 | FastAPI, Uvicorn, SQLAlchemy, Pydantic | Backend | OSS | ₹0 | — |
| S5 | React, Vite, TypeScript, Tailwind, Plotly.js/ECharts | Frontend | OSS | ₹0 | — |
| S6 | Google Stitch | Generate UI from prompts | Free access **[verify current availability/limits]** | ₹0 | Fallback: hand-written React with the same design tokens |
| S7 | GitHub (private/public repo, Actions) | VCS, CI | Free tier **[verify minutes]** | ₹0 | GitLab |
| S8 | Docker Desktop / Docker Engine | Packaging | Free for students/personal use **[verify licence]**; Engine free on Linux | ₹0 | Plain venv |
| S9 | WeasyPrint / Jinja2 | PDF/HTML report | OSS | ₹0 | Export HTML→PDF via browser print |
| S10 | Experiment tracking (CSV; optional MLflow/W&B) | Traceability | OSS / free tier **[verify]** | ₹0 | CSV only |
| S11 | Design/diagram tools (Mermaid, draw.io) | Docs | Free | ₹0 | — |

## 4. Deployment and sharing

| # | Resource | Purpose | Cost | Limitation |
|---|---|---|---|---|
| X1 | Local demo | Primary | ₹0 | Needs laptop at presentation |
| X2 | Static/CPU free hosting (Hugging Face Space, GitHub Pages) | Optional public demo of precomputed results | ₹0 *(verify limits)* | No heavy live inference; storage limits |
| X3 | Domain name | Optional polish | ≈ ₹800–1,200/yr *(estimate)* | Not needed |
| X4 | Small VPS | Optional always-on demo | ≈ ₹400–1,500/mo *(estimate)* | CPU-only; slow inference |
| X5 | Video recording (OBS) | Backup demo video | ₹0 | — |

## 5. Human resources
| Role | Count | Commitment (proposed) |
|---|---|---|
| R1 ML lead | 1 | ≈ 85 h |
| R2 Data/geo lead | 1 | ≈ 85 h |
| R3 Backend & evaluation | 1 | ≈ 85 h |
| R4 Frontend & PM | 1 | ≈ 85 h |
| Mentor/faculty (advisory, optional) | 1 | few hours |
All unpaid student time (≈ 340 h). Team of 3: R3/R4 merge backend duties; drop PDF export and experiment-compare UI first.

---

## 6. Budget scenarios

### Scenario 1 — Zero / minimum cost
| Item | Cost |
|---|---|
| Owned laptops (H1) | ₹0 |
| Free Colab/Kaggle (H2) | ₹0 |
| Public data (D1–D3), OSS stack (S1–S11) | ₹0 |
| Local demo (X1), OBS video (X5) | ₹0 |
| **Total** | **₹0** |
Scope: B0, B1, B3 fully; B4 only if a free GPU session is obtainable; crops kept on local disk; demo local + video.
Risks: GPU quota volatility; slower downloads; no always-on demo.

### Scenario 2 — Recommended
| Item | Cost (estimate) | Type |
|---|---|---|
| Paid GPU subscription, 1–2 months (H3) | ₹1,000–2,600 | Recurring |
| External SSD 500 GB–1 TB (H5) | ₹4,000–7,000 | One-time |
| Contingency (10%) | ≈ ₹500–1,000 | — |
| **Total** | **≈ ₹3,000–8,000 (depending on whether the SSD is bought)** | |
Scope: Scenario 1 + reliable fine-tuning runs, safer data handling.

### Scenario 3 — Optional enhanced
| Item | Cost (estimate) | Type |
|---|---|---|
| Rented GPU 50–100 h (H4) | ₹1,500–7,000 | Pay-per-use |
| Paid GPU subscription (H3) | ₹1,000–2,600 | Recurring |
| External SSD 1 TB (H5) | ₹5,000–7,000 | One-time |
| Small VPS 2–3 months (X4) | ₹1,200–4,500 | Recurring |
| Domain (X3) | ₹800–1,200 | Annual |
| Contingency (10%) | ≈ ₹1,000–2,000 | — |
| **Total** | **≈ ₹10,000–25,000** | |
Scope: Larger hyper-parameter sweep, Himawari training data, always-on lightweight demo (precomputed results; inference still CPU-limited).

### Verification actions before spending
1. Re-check subscription and GPU hourly prices on provider pages. 2. Read RIFE repo LICENSE and weights terms. 3. Confirm Colab/Kaggle current GPU quotas. 4. Confirm MOSDAC account status. 5. Confirm Stitch availability and output export options.

### Items intentionally **not** assumed
Paid cloud credits; sponsor-provided GPUs; unrestricted dataset access; hosting of redistributed data; high-end workstation.
