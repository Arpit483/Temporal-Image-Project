# 05 — Implementation (Documents 33–37)

**Package version:** 0.1 Draft · **Date:** 2026-10-25 · Proposed conventions; adjust to the team's tooling.

---

## Doc 33 — Coding Standards
**Purpose:** Consistent, reviewable code.

| Area | Standard |
|---|---|
| Python style | PEP 8 via `ruff` + `black` (line length 100); `isort` rules in ruff |
| Typing | Type hints on all public functions; `mypy --strict` on `framefill/core`, relaxed elsewhere |
| Docstrings | Google style; every public function states units (K, px, min) |
| Naming | `snake_case` functions/vars, `PascalCase` classes, constants `UPPER_SNAKE`; physical variables suffixed with unit where ambiguous (`dt_min`, `bt_k`) |
| Numerics | `float32` BT; no silent dtype casts; explicit NaN handling; never use per-image min-max normalisation |
| Randomness | One `seed` config; seed `random`, `numpy`, `torch`; log it |
| Errors | Raise typed exceptions mapped to error codes (Doc 17.5); no bare `except` |
| Logging | `logging` with job_id context; no `print` in library code |
| Paths | `pathlib`; no hard-coded absolute paths; config-driven |
| Secrets | Only in `.env` (gitignored); `.env.example` committed |
| Tests | New logic needs a unit test; bugs need a regression test |
| Frontend | TypeScript strict; ESLint + Prettier; functional components; API types generated from OpenAPI |
| Reviews | Every PR reviewed by ≥1 other member; checklist: tests, docs, units, no data committed |
| Scientific hygiene | Any metric or claim in docs must reference an `EXP-xxx` |

---

## Doc 34 — Git and Branching Strategy

| Item | Rule |
|---|---|
| Model | Trunk-based with short-lived feature branches |
| Branches | `main` (always green, demo-ready) · `feat/<module>-<short>` · `fix/<id>` · `exp/<EXP-xxx>` (experiments) · `docs/<topic>` |
| Commits | Conventional Commits: `feat(m3): add DIS flow engine` |
| PRs | Small (<400 lines); CI must pass (lint, unit tests); squash merge |
| Tags | `v0.1.0` MVP-core, `v0.2.0` MVP-plus, `v1.0.0` final submission |
| Large files | **Never commit** data or `.pth` > 25 MB; use `.gitignore`, optional Git LFS or Hugging Face Hub / Drive links in `models/README.md` |
| Notebooks | Strip outputs (`nbstripout`); keep exploration under `notebooks/` |
| Protection | Require PR + 1 review on `main` (GitHub setting) |

---

## Doc 35 — Source Code and Repository Structure
```
framefill/
├─ pyproject.toml            # deps + tool config
├─ README.md  LICENSE  CITATION.cff
├─ .env.example  .gitignore  .pre-commit-config.yaml
├─ configs/
│   ├─ data.yaml  goes19_c13.yaml  insat3ds.yaml
│   ├─ engines/{blend,flow_dis,rife_b3,rife_b4}.yaml
│   └─ experiments/EXP-01.yaml ...
├─ framefill/
│   ├─ ingest/    goes19.py  insat.py  himawari.py(optional)  manifest.py
│   ├─ preprocess/ calibrate.py  masks.py  normalise.py  tiling.py  grid.py
│   ├─ engines/   base.py  blend.py  flow_warp.py  rife.py  recursive.py  flowviz.py
│   ├─ io/        fillnc.py  validate.py
│   ├─ eval/      triplets.py  metrics.py  masks.py  runner.py  stats.py
│   ├─ report/    plots.py  build.py  templates/report.html.j2
│   ├─ api/       main.py  routes/  jobs.py  db.py  render.py  schemas.py
│   ├─ cli.py     # framefill run|eval|report|inspect
│   └─ config.py  errors.py  logging.py
├─ web/           # React + Vite app (from Stitch output)
│   ├─ src/{pages,components,api,hooks,theme}/
│   └─ package.json
├─ third_party/   # RIFE code (vendored with licence) or git submodule
├─ models/        README.md (download instructions) MODEL_CARD.md
├─ data/          (gitignored) raw/ derived/ outputs/ db/
├─ experiments/   EXP-xxx/ summary.csv
├─ tests/         unit/ integration/ system/ fixtures/(tiny synthetic NC)
├─ docs/          (these SDLC documents)
├─ docker/        Dockerfile.api  Dockerfile.web  docker-compose.yml
└─ .github/workflows/ci.yml
```
**Module dependency rule:** `api → {eval, engines, io, preprocess, ingest}`; `engines → preprocess`; no imports from `api` into core.

---

## Doc 36 — Environment Setup and Dependency Management

| Item | Specification |
|---|---|
| Python | 3.11 (single supported minor version) |
| Manager | `uv` or `conda`; lockfile committed |
| Core deps (indicative; pin after first green run) | `numpy`, `scipy`, `xarray`, `netCDF4`, `h5py`, `h5netcdf`, `opencv-python-headless`, `scikit-image`, `torch`, `torchvision`, `pydantic`, `fastapi`, `uvicorn[standard]`, `sqlalchemy`, `pillow`, `matplotlib`, `jinja2`, `pyyaml`, `boto3` *(optional, S3)*, `s3fs` *(optional)*, `pytest`, `ruff`, `black`, `mypy` |
| Optional | `piq` (FSIM), `weasyprint` (PDF), `cartopy`/`pyproj` (overlays), `satpy` (Himawari), `imageio-ffmpeg` (MP4) |
| GPU | CUDA-matched PyTorch build; CPU wheels otherwise |
| Node | Node 20 LTS; `pnpm` or `npm`; Vite |
| OS notes | Windows: use WSL2 or conda for netCDF4/h5py wheels; macOS: Apple-silicon use CPU/MPS **[MPS support for RIFE ops unverified]** |
| Setup commands | See Doc 47 |
| Reproducibility | `pip freeze > requirements.lock`; record `torch.__version__`, CUDA, driver in each job |
| Weights | `scripts/get_weights.py` downloads to `models/`; verifies SHA-256 recorded in `models/README.md` |

---

## Doc 37 — Configuration Management Plan

| Aspect | Rule |
|---|---|
| Config format | YAML validated by Pydantic; one file per experiment/job |
| Precedence | CLI flags > job request JSON > experiment YAML > defaults |
| Snapshot | Resolved config + SHA-256 stored in DB and in NetCDF attrs (`config_hash`) |
| Example engine config | see below |
| Environments | `dev` (local), `ci` (tiny fixtures), `demo` (preloaded sample results) |
| Secrets | `.env` only; CI secrets in GitHub settings; never in YAML |
| Change control | Config schema changes require version bump `config_version` and a migration note |
| Baselines | Experiment configs immutable once an `EXP` is reported; create a new EXP instead |

```yaml
# configs/engines/rife_b3.yaml (illustrative)
engine: rife
weights: models/rife_pretrained.pth      # path/name to record in model card
bt_range_k: [180, 330]
invert: false
tile: 1024
overlap: 64
scale: 1.0
channels: replicate3
guard_k: 5
seed: 42
```
