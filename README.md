# FrameFill: AI Temporal Interpolation for GOES-16/19 Thermal-IR Imagery

Research prototype and scientific workstation for geostationary satellite thermal-IR frame interpolation.
Give it two consecutive satellite scans ($t=0$ and $t=20$ min); it predicts the intermediate state ($t=10$ min).

> **Important Scientific Disclosure**: All predicted middle frames are **synthetic machine learning estimates**, not satellite observations.

---

## Table of Contents
1. [Repository & Directory Structure](#1-repository--directory-structure)
2. [Prerequisites & System Requirements](#2-prerequisites--system-requirements)
3. [Environment Setup (Step-by-Step)](#3-environment-setup-step-by-step)
   - [A. Python Backend Environment](#a-python-backend-environment)
   - [B. Frontend Web Environment](#b-frontend-web-environment)
   - [C. Environment Variables (`.env`)](#c-environment-variables-env)
4. [Dataset & Model Weights: Downloads & Storage Locations](#4-dataset--model-weights-downloads--storage-locations)
   - [A. RIFE v4.22 Neural Network Weights](#a-rife-v422-neural-network-weights)
   - [B. NOAA GOES-16 Full-Disk NetCDF Files (Hurricane Milton Day 281)](#b-noaa-goes-16-full-disk-netcdf-files-hurricane-milton-day-281)
   - [C. NOAA GOES-19 Real Validation Triplet](#c-noaa-goes-19-real-validation-triplet)
   - [D. Precomputed Storm Sequences (`results/`)](#d-precomputed-storm-sequences-results)
5. [Running the Application](#5-running-the-application)
   - [Option 1: Development Server](#option-1-development-server)
   - [Option 2: Unified Production Server (FastAPI + React Build)](#option-2-unified-production-server-fastapi--react-build)
   - [Option 3: Docker](#option-3-docker)
6. [Testing & Quality Verification](#6-testing--quality-verification)
7. [Scientific Methodology & Benchmark Results](#7-scientific-methodology--benchmark-results)

---

## 1. Repository & Directory Structure

To reproduce the exact workstation layout on your PC, ensure your folder structure matches this layout:

```text
model/
├── framefill/                 # Core Python scientific package
│   ├── api.py                 # FastAPI endpoints & static file server
│   ├── engines.py             # Interpolation algorithms (Blend, DIS Flow, RIFE, Average)
│   ├── preprocess.py          # NetCDF loader, Kelvin calibration, NaN masks, 180-330 K norm
│   ├── metrics.py             # Scientific validation (MAE, RMSE, Dynamic RMSE, Cold Cloud, PSNR, SSIM)
│   ├── io_nc.py               # CF-compliant NetCDF4 output writer
│   ├── exports.py             # GIF & ZIP export utilities
│   ├── jobs.py                # Async SQLite job queue
│   └── ai_chat.py             # Meteorological reasoning via OpenRouter Nemotron
├── web/                       # React 19 + TypeScript + Vite + Tailwind CSS Frontend
│   ├── src/
│   │   ├── pages/             # PredictPage, ViewerPage, DifferencePage, SequencePage, ResultsPage, etc.
│   │   ├── components/        # Navbar, FramePanel, MetricsTable, ColorBar, AiChatPanel, etc.
│   │   └── api.ts             # REST client for /api/*
│   ├── package.json
│   └── vite.config.ts
├── third_party/
│   └── rife_pkg/              # RIFE model architecture & weights
│       ├── model/             # warplayer.py, loss.py
│       └── train_log/         # flownet.pkl (Model weights)
├── examples/
│   └── goes19_real_triplet/   # Sample triplet loaded by "Load Sample NetCDFs" button
│       ├── t0_0000.nc
│       ├── truth_mid_0010.nc
│       ├── t20_0020.nc
│       └── predicted_mid_0010.nc
├── results/                   # Benchmark CSVs and precomputed sequence NetCDFs
│   ├── framefill_dayA_10min.nc
│   ├── framefill_dayA_10min_geo.nc
│   ├── hurricane_milton_cat5_10min.nc
│   ├── hurricane_beryl_cat5.nc
│   ├── typhoon_otis_rapid_intensification.nc
│   ├── midwest_derecho_bow_echo.nc
│   ├── pacific_atmospheric_river.nc
│   └── all_results_20to10.csv
├── tests/                     # Pytest suite
│   ├── test_core.py
│   ├── test_api_jobs.py
│   └── test_rife_parity.py
├── .env                       # API keys (OpenRouter)
├── Dockerfile                 # Unified multi-stage Docker build
├── docker-compose.yml
├── pyproject.toml
└── requirements.txt
```

---

## 2. Prerequisites & System Requirements

- **Operating System**: Windows 10/11, macOS, or Ubuntu Linux (20.04/22.04 LTS).
- **Python**: Version `3.10`, `3.11`, or `3.12` (Python 3.13 is also supported on Windows CPU).
- **Node.js**: Version `18.x` or `20.x` LTS + `npm` (required to compile the React frontend).
- **RAM**: Minimum 8 GB (16 GB recommended for full-disk NetCDF array processing).
- **Disk Space**: ~3 GB for dependencies and satellite datasets.
- **Hardware Acceleration (Optional)**: NVIDIA GPU with CUDA support for sub-second RIFE neural inference. If no GPU is found, the system automatically falls back to CPU optical flow (OpenCV DIS).

---

## 3. Environment Setup (Step-by-Step)

### A. Python Backend Environment

1. **Clone the repository and open a terminal:**
   ```bash
   git clone https://github.com/Arpit483/Temporal-Image-Project.git
   cd Temporal-Image-Project
   ```

2. **Create and activate a virtual environment:**
   - **Windows (PowerShell):**
     ```powershell
     python -m venv .venv
     .\.venv\Scripts\Activate.ps1
     ```
   - **Linux / macOS:**
     ```bash
     python3 -m venv .venv
     source .venv/bin/activate
     ```

3. **Upgrade `pip` and install base dependencies:**
   ```bash
   pip install --upgrade pip
   pip install -r requirements.txt
   ```

4. **Install PyTorch:**
   - **For CPU only:**
     ```bash
     pip install torch torchvision --index-url https://download.pytorch.org/whl/cpu
     ```
   - **For NVIDIA GPU (CUDA 12.1/12.4):**
     ```bash
     pip install torch torchvision --index-url https://download.pytorch.org/whl/cu121
     ```

---

### B. Frontend Web Environment

1. **Navigate to the `web/` folder and install dependencies:**
   ```bash
   cd web
   npm install
   ```

2. **Build the production frontend assets:**
   ```bash
   npm run build
   ```
   *This compiles optimized HTML, CSS, and JS bundles into `web/dist/`, which the FastAPI backend serves directly.*

3. **Return to the project root:**
   ```bash
   cd ..
   ```

---

### C. Environment Variables (`.env`)

Create a `.env` file in the project root (`model/.env`):

```ini
# Optional: Used for the Nemotron 70B meteorological AI assistant drawer in the UI
OPENROUTER_API_KEY=your_openrouter_api_key_here

# Optional: Path to RIFE model weights (defaults to third_party/rife_pkg)
FRAMEFILL_RIFE_DIR=third_party/rife_pkg
```

*(Note: If no OpenRouter key is provided, all interpolation, difference maps, viewers, and sequence playback remain 100% operational; only the interactive AI chatbot will indicate that the API key is not configured).*

---

## 4. Dataset & Model Weights: Downloads & Storage Locations

### A. RIFE v4.22 Neural Network Weights

The ensemble engine uses the RIFE (Real-Time Intermediate Flow Estimation) v4.22 model combined with OpenCV DIS optical flow.

- **Destination directory**: `third_party/rife_pkg/train_log/`
- **File name**: `flownet.pkl`
- **Download Link**:
  - Official RIFE repository: [hzwer/Practical-RIFE](https://github.com/hzwer/Practical-RIFE)
  - Direct weights mirror: [Google Drive / HuggingFace RIFE v4.22 weights](https://github.com/hzwer/Practical-RIFE/releases)
- **Directory layout verification**:
  ```text
  third_party/rife_pkg/
  ├── model/
  │   ├── loss.py
  │   ├── warplayer.py
  │   └── pytorch_msssim/
  └── train_log/
      └── flownet.pkl   <-- Must be placed here (~15-30 MB)
  ```

---

### B. NOAA GOES-16 Full-Disk NetCDF Files (Hurricane Milton Day 281)

The full-disk satellite scans for Hurricane Milton (Category 5) from October 7, 2024, are stored at the root of the project directory.

These files are hosted publicly on NOAA's Open Data Dissemination (NODD) Amazon S3 bucket:
- **Bucket**: `noaa-goes16`
- **Product**: `ABI-L2-CMIPF` (Cloud and Moisture Imagery - Full Disk)
- **Band**: Channel 13 (Clean Thermal-IR, 10.3 $\mu$m)
- **Year / Day of Year**: `2024 / 281` (October 7, 2024)
- **Hour**: `18` UTC

#### Download Links & Where to Store:
Save these files directly into the project root directory (`model/`):

| File Name | Public AWS S3 Direct Download Link | Size | Storage Path |
|---|---|---|---|
| `OR_ABI-L2-CMIPF-M6C13_G16_s20242811800205_e20242811809525_c20242811812316.nc` | [Download](https://noaa-goes16.s3.amazonaws.com/ABI-L2-CMIPF/2024/281/18/OR_ABI-L2-CMIPF-M6C13_G16_s20242811800205_e20242811809525_c20242811812316.nc) | ~23 MB | `model/` |
| `OR_ABI-L2-CMIPF-M6C13_G16_s20242811810205_e20242811819525_c20242811819587.nc` | [Download](https://noaa-goes16.s3.amazonaws.com/ABI-L2-CMIPF/2024/281/18/OR_ABI-L2-CMIPF-M6C13_G16_s20242811810205_e20242811819525_c20242811819587.nc) | ~23 MB | `model/` |
| `OR_ABI-L2-CMIPF-M6C13_G16_s20242811820205_e20242811829525_c20242811829596.nc` | [Download](https://noaa-goes16.s3.amazonaws.com/ABI-L2-CMIPF/2024/281/18/OR_ABI-L2-CMIPF-M6C13_G16_s20242811820205_e20242811829525_c20242811829596.nc) | ~23 MB | `model/` |
| `OR_ABI-L2-CMIPF-M6C13_G16_s20242811830205_e20242811839526_c20242811840011.nc` | [Download](https://noaa-goes16.s3.amazonaws.com/ABI-L2-CMIPF/2024/281/18/OR_ABI-L2-CMIPF-M6C13_G16_s20242811830205_e20242811839526_c20242811840011.nc) | ~23 MB | `model/` |
| `OR_ABI-L2-CMIPF-M6C13_G16_s20242811840205_e20242811849525_c20242811849593.nc` | [Download](https://noaa-goes16.s3.amazonaws.com/ABI-L2-CMIPF/2024/281/18/OR_ABI-L2-CMIPF-M6C13_G16_s20242811840205_e20242811849525_c20242811849593.nc) | ~23 MB | `model/` |
| `OR_ABI-L2-CMIPF-M6C13_G16_s20242811850205_e20242811859525_c20242811859587.nc` | [Download](https://noaa-goes16.s3.amazonaws.com/ABI-L2-CMIPF/2024/281/18/OR_ABI-L2-CMIPF-M6C13_G16_s20242811850205_e20242811859525_c20242811859587.nc) | ~23 MB | `model/` (or `storm_downloads/`) |
| `OR_ABI-L2-CMIPF-M6C13_G16_s20242811900205_e20242811909525_c20242811910000.nc` | [Download](https://noaa-goes16.s3.amazonaws.com/ABI-L2-CMIPF/2024/281/19/OR_ABI-L2-CMIPF-M6C13_G16_s20242811900205_e20242811909525_c20242811910000.nc) | ~23 MB | `model/` (or `storm_downloads/`) |
| `OR_ABI-L2-CMIPF-M6C13_G19_s20260010000226_e20260010009546_c20260010010005.nc` | [Download](https://noaa-goes19.s3.amazonaws.com/ABI-L2-CMIPF/2026/001/00/OR_ABI-L2-CMIPF-M6C13_G19_s20260010000226_e20260010009546_c20260010010005.nc) | ~22 MB | `model/` (or `storm_downloads/`) |
| `OR_ABI-L2-CMIPF-M6C13_G19_s20260010010226_e20260010019545_c20260010020006.nc` | [Download](https://noaa-goes19.s3.amazonaws.com/ABI-L2-CMIPF/2026/001/00/OR_ABI-L2-CMIPF-M6C13_G19_s20260010010226_e20260010019545_c20260010020006.nc) | ~22 MB | `model/` (or `storm_downloads/`) |
| `OR_ABI-L2-CMIPF-M6C13_G19_s20260010020226_e20260010029545_c20260010030011.nc` | [Download](https://noaa-goes19.s3.amazonaws.com/ABI-L2-CMIPF/2026/001/00/OR_ABI-L2-CMIPF-M6C13_G19_s20260010020226_e20260010029545_c20260010030011.nc) | ~22 MB | `model/` (or `storm_downloads/`) |

---

### C. NOAA GOES-19 Real Validation Triplet

These are the 512×512 calibrated crop files loaded automatically when you click **"Load Sample NetCDFs"** in the web interface.

- **Storage Location**: `examples/goes19_real_triplet/`
- **Files required**:
  - `t0_0000.nc`: Initial scan at $t=0$ min (~311 KB)
  - `truth_mid_0010.nc`: Real observed satellite ground truth at $t=10$ min (~311 KB)
  - `t20_0020.nc`: Subsequent scan at $t=20$ min (~310 KB)
  - `predicted_mid_0010.nc`: Pre-interpolated benchmark comparison file (~1.7 MB)

*These files are already included in the repository under `examples/goes19_real_triplet/`.*

---

### D. Precomputed Storm Sequences (`results/`)

The **Sequence** page displays continuous 10-minute animated time series for meteorological events. These files are stored in `results/`:

| Sequence Name | Event Description | Satellite & Date | Storage File Path |
|---|---|---|---|
| `hurricane_milton_cat5_10min.nc` | Hurricane Milton Rapid Intensification | GOES-16 (Oct 2024) | `results/hurricane_milton_cat5_10min.nc` |
| `hurricane_beryl_cat5.nc` | Hurricane Beryl Cat-5 Eye Structure | GOES-16 (Jul 2024) | `results/hurricane_beryl_cat5.nc` |
| `typhoon_otis_rapid_intensification.nc` | Super Typhoon Otis landfall | GOES-18 (Oct 2023) | `results/typhoon_otis_rapid_intensification.nc` |
| `midwest_derecho_bow_echo.nc` | Midwest Derecho Convective Bow Echo | GOES-16 (Jul 2024) | `results/midwest_derecho_bow_echo.nc` |
| `pacific_atmospheric_river.nc` | Pacific Atmospheric River Plume | GOES-18 (Feb 2024) | `results/pacific_atmospheric_river.nc` |
| `framefill_dayA_10min.nc` | Day A 24-hr Benchmark Sequence | GOES-19 | `results/framefill_dayA_10min.nc` |
| `framefill_dayA_10min_geo.nc` | Day A Georeferenced Sequence | GOES-19 | `results/framefill_dayA_10min_geo.nc` |

If you want to re-download raw scans from S3 and re-synthesize any sequence from scratch, run:
```bash
python build_all_sequences.py
```

---

## 5. Running the Application

### Option 1: Development Server (Live Reloading)

Run backend and frontend concurrently in two terminals:

**Terminal 1 (Backend API):**
```bash
# In project root (model/)
uvicorn framefill.api:app --reload --host 127.0.0.1 --port 8000
```

**Terminal 2 (Frontend with Hot-Reload):**
```bash
cd web
npm run dev
```
Open **http://localhost:5173** in your browser. Requests to `/api/*` are proxied automatically to `:8000`.

---

### Option 2: Unified Production Server (FastAPI + React Build)

This is how the workstation runs in production without needing Node.js in the background:

1. **Build the web application:**
   ```bash
   cd web
   npm run build
   cd ..
   ```
2. **Start the FastAPI server:**
   ```bash
   uvicorn framefill.api:app --host 127.0.0.1 --port 8000
   ```
3. Open **http://127.0.0.1:8000** in your browser. FastAPI serves the compiled React app and all API routes from a single port.

---

### Option 3: Docker

Build and run the entire stack inside a self-contained container:

```bash
# 1. Build the multi-stage image
docker build -t framefill:latest .

# 2. Run the container
docker run -d -p 8000:8000 -e OPENROUTER_API_KEY="your-key-here" --name framefill framefill:latest
```
Access at **http://localhost:8000**.

---

## 6. Testing & Quality Verification

Run the full verification suite to ensure everything on your machine behaves identically to our tested environment:

### 1. Pytest Backend Suite (31 Tests)
```bash
pytest tests/test_core.py tests/test_api_jobs.py tests/test_rife_parity.py -v
```
Verifies Kelvin normalization roundtrip (180–330 K), NaN mask boundary handling, optical flow motion prediction, job queues, and RIFE neural tensor parity.

### 2. Vitest Frontend Unit Tests
```bash
cd web
npx vitest run
cd ..
```
Verifies badge renders, colorbars, and banner alert contracts.

### 3. Playwright End-to-End Browser Smoke Test
```bash
cd web
npx playwright test
cd ..
```
Runs a headless browser through the entire research workflow: loading sample NetCDFs, running prediction, inspecting the viewer split slider, validating difference maps, and opening the AI drawer.

### 4. Code Quality & Formatting
```bash
ruff check framefill/ tests/
```

---

## 7. Scientific Methodology & Benchmark Results

*(Evaluated on GOES-19 Ch13 clean thermal-IR, 512×512 spatial crops, dynamic-pixel RMSE in Kelvin)*

### 20 $\to$ 10 min Hold-Out Cadence
| Dataset & Role | Baseline Average | DIS Optical Flow | RIFE v4.22 | 50/50 Ensemble Blend |
|---|---|---|---|---|
| **Day A** (Validation) | 4.193 K | 2.500 K | 2.491 K | **2.407 K** |
| **Day B** (Validation) | 4.033 K | 2.693 K | 2.619 K | **2.559 K** |
| **Day C** (Clean Test, Quiet Region) | 4.552 K | 1.990 K | 1.959 K | **1.876 K** |
| **Day D** (Clean Test, Stormy, ~33% Cold Cloud) | 5.678 K | 3.042 K | 2.916 K | **2.855 K** |

### 60 $\to$ 30 min Stress Cadence
| Dataset | Baseline Average | DIS Optical Flow | RIFE v4.22 | 50/50 Ensemble Blend |
|---|---|---|---|---|
| **Day C** (Quiet Region) | 7.026 K | 4.728 K | 4.721 K | **4.379 K** |
| **Day D** (Stormy Region) | 10.154 K | 7.984 K | 7.485 K | **7.158 K** |

### Key Findings
1. **Ensemble Synergy**: The 50/50 blend of classical OpenCV DIS optical flow with deep-learning RIFE v4.22 consistently outperforms both standalone engines across all validation and test days.
2. **Dynamic Error Reduction**: In active convective cloud clusters ($T_B < 235$ K), the ensemble lowers dynamic-pixel RMSE by over **49%** compared to linear persistence/averaging baselines.
3. **Physical Preservation**: Unlike standard 8-bit RGB video interpolation, FrameFill operates directly on calibrated floating-point Kelvin arrays, guaranteeing that valid physical temperature limits (180 K – 330 K) and missing-data masks (`NaN`) are accurately preserved.
