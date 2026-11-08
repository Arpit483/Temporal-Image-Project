# 10 — UI/UX Specification and Prompts for Google Stitch (Phase 6)

**Version 0.1 · 2026-10-25 · Purpose:** Paste-ready prompts to generate the FrameFill front end, plus design tokens, component tree and a UI↔backend mapping.
**Important:** Stitch output is a *visual starting point*. Anything marked **[VISUAL ONLY]** has no backend behaviour specified and must not be presented as working. Functional controls reference APIs in `03_System_Design.md` Doc 23. All sample numbers in prompts are **illustrative placeholders**, not results.
*(Stitch's current capabilities, limits and export options were not verified; if a prompt is too long, paste the master prompt first and then one screen prompt at a time.)*

---

## Part A — Shared design system

### A.1 Design tokens
| Token | Dark (default) | Light (optional) | Use |
|---|---|---|---|
| `--bg` | `#0B0F14` | `#F5F7FA` | App background |
| `--surface-1` | `#121821` | `#FFFFFF` | Cards, panels |
| `--surface-2` | `#1A2230` | `#EEF2F7` | Inputs, table stripes |
| `--border` | `#273245` | `#D5DCE6` | Dividers |
| `--text` | `#E7ECF3` | `#0F1722` | Primary text |
| `--text-muted` | `#9FB0C3` | `#4B5A6E` | Secondary text |
| `--primary` | `#5AA9FF` | `#1F6FD1` | Primary actions, links, focus ring |
| `--accent-synthetic` | `#F5B642` | `#B26A00` | **SYNTHETIC** badge and outlines |
| `--observed` | `#7DD3C0` | `#0E7C66` | **OBSERVED** badge |
| `--success` | `#3FB68B` | `#13795B` | Success |
| `--warning` | `#F5B642` | `#9A6200` | Warnings |
| `--danger` | `#F0605D` | `#B42318` | Errors |
| Diverging (difference maps) | blue `#3B82C4` ↔ neutral ↔ orange `#E8833A` | same | Colour-blind-safer than red/blue; legend states "blue = prediction colder; orange = prediction warmer" |
| Typography | UI: Inter (fallback system-ui); numerics/code: JetBrains Mono (fallback ui-monospace) | | Scale 12/14/16/20/24/32 px; line-height 1.5 |
| Spacing / radius | 4-px grid (4,8,12,16,24,32); radius 6 px (inputs), 10 px (cards) | | |
| Elevation | Flat; 1-px borders; no heavy shadows | | |
| Motion | 150 ms ease; none when `prefers-reduced-motion` | | |
| Image colour maps (selectable) | "IR grey (cold = white)" default · "Cividis" · "Viridis" · "Inferno" ; **fixed BT range per job**, default 180–330 K | | Always show colour bar with kelvin ticks |

### A.2 Component guidelines
- **Badges:** `OBSERVED` (teal outline), `SYNTHETIC L1` / `SYNTHETIC L2` (amber filled + diagonal-stripe corner marker on the image so the status survives screenshots).
- **Image panels:** 1:1 or native aspect; title bar (source, timestamp UTC, frame index); never auto-stretch beyond 2× native pixels; pixel-probe tooltip showing BT in K and row/col.
- **Metric tiles:** value, unit, N, small info icon → definition popover; show "n/a" with reason when not computed.
- **Tables:** sticky header, sortable, numeric columns right-aligned monospace, units in header.
- **Charts:** axis titles with units, legend, keyboard-focusable points, table-view toggle; no colour-only encoding (use markers/dash styles).
- **Banners:** persistent "Synthetic frames are AI-generated estimates — not observations" on S4–S8; INSAT results add "No ground truth at 15/7.5 min".
- **Forms:** label above field, helper text, inline validation on blur, disabled submit until valid, error summary at top.
- **States:** every data region has Loading (skeleton), Empty (explanation + primary action), Error (message, error code, retry), Success (toast + inline confirmation).
- **Accessibility:** WCAG 2.1 AA; visible 2-px focus ring; full keyboard operation (Space play/pause, ←/→ step, `[` `]` speed, `C` compare, `D` diff); ARIA labels on canvases with textual alternative (timestamp, type, summary stats); no flashing >3 Hz; `prefers-reduced-motion` stops autoplay; touch targets ≥ 44 px.
- **Responsive:** ≥1280 px: side nav + two-panel layouts; 768–1279 px: collapsible nav, stacked panels; <768 px: bottom nav (S1,S3,S4,S6,More), single panel, horizontal scroll for tables, controls in bottom sheet.
- **Theme:** dark default; light via toggle; respects OS preference initially.

### A.3 Global layout and navigation
Top bar: logo "FrameFill" · active dataset chip · active job chip with status · theme toggle · help. Left nav (icons+labels): **Overview, Datasets, Run, Viewer, Compare, Metrics, Experiments, Export & Report, About**. Breadcrumbs inside pages. Route map: `/` S1, `/datasets` S2, `/run` S3, `/viewer/:jobId` S4, `/compare/:jobId` S5, `/metrics/:jobId` S6, `/experiments` S7, `/export/:jobId` S8, `/about` S9.

---

## Part B — Master Stitch prompt (paste first)

```
Design a responsive web dashboard called "FrameFill — AI Temporal Interpolation for Satellite Imagery" for researchers and hackathon judges. It lets users load thermal-infrared geostationary satellite frames, generate AI-interpolated intermediate frames, play synchronized animations of original vs interpolated sequences, compare frames, view difference maps and validation metrics, compare models/experiments, and export results.

STYLE: professional scientific visualization tool. Dark theme by default with an optional light theme (toggle in top bar). Restrained palette: near-black blue-grey backgrounds (#0B0F14, panels #121821), text #E7ECF3, primary blue #5AA9FF, amber #F5B642 reserved for the SYNTHETIC badge, teal #7DD3C0 for OBSERVED, red #F0605D for errors. Fonts: Inter for UI, JetBrains Mono for numbers. Flat panels with 1px borders, 10px radius, 4px spacing grid, high contrast, no gradients or decorative imagery. Satellite images are rendered as square panels with a visible color bar in kelvin.

NAVIGATION: top bar (logo, active dataset chip, active job status chip, theme toggle, help) and left sidebar with 9 items: Overview, Datasets, Run, Viewer, Compare, Metrics, Experiments, Export & Report, About. On mobile use a bottom navigation bar with 5 items and a "More" sheet.

GLOBAL RULES: Every interpolated frame must be clearly labeled with an amber "SYNTHETIC" badge; observed frames with a teal "OBSERVED" badge. Show a persistent info banner on Viewer/Compare/Metrics/Export: "Synthetic frames are AI-generated estimates, not satellite observations." Every screen needs loading (skeleton), empty, error (with error code and Retry) and success states. Fully keyboard accessible, WCAG 2.1 AA contrast, focus rings, ARIA labels, respects reduced motion. All numbers shown in sample content are ILLUSTRATIVE PLACEHOLDERS and should be labeled "Sample data".

Generate the 9 screens described next, consistent with the shared component library (cards, tables, metric tiles, badges, banners, form fields, sliders, tabs, toasts, modals).
```

---

## Part C — Per-screen prompts

> For each screen: **Functional** items are backed by an API (see Part F). **[VISUAL ONLY]** items are decoration or future work.

### S1 — Overview dashboard
```
SCREEN: Overview (route "/").
LAYOUT: Page title "Overview". Row 1: four summary cards — "Datasets loaded", "Jobs completed", "Best model (by validation)", "Last validation run" (sample values). Row 2: left (2/3 width) "Recent jobs" table (columns: Job ID, Dataset, Engine, Levels, Status chip, Progress bar, Started, Duration, Actions: Open viewer / Metrics). Right (1/3): "Quick start" card with 4 numbered steps (Load data → Configure → Run → Review) and a primary button "Load a dataset". Row 3: "Data & model status" card listing: compute device (CPU/GPU), available engines (Blend, Flow-warp, RIFE), model weights version, API status dot. Footer: attribution text placeholder "Data: NOAA GOES-19 / MOSDAC (ISRO) — attribution shown as applicable".
DATA: counts, recent jobs list, system info.
INTERACTIONS: click a job row opens Viewer; "Load a dataset" goes to Datasets; refresh icon reloads; status chips are colour+icon+text.
STATES: Loading skeleton cards; Empty ("No jobs yet. Load a dataset to begin." + primary button); Error (API unreachable banner with Retry); Success none needed.
RESPONSIVE: cards 4→2→1 columns; table becomes card list on mobile.
ACCESSIBILITY: table with caption and row headers; status not by colour alone.
```

### S2 — Dataset ingestion and metadata preview
```
SCREEN: Datasets (route "/datasets").
LAYOUT: Left column: "Add data" card with tabs: (1) "Upload files" — drag-and-drop zone accepting .nc and .h5, file list with size and per-file validation status; (2) "Use local path" — text field for a server-side folder path; (3) "Fetch GOES-19 (optional)" — start/end UTC date-time pickers, channel fixed to "C13 (10.3 µm)", ROI inputs (y0,y1,x0,x1), button "Fetch". Right column: "Dataset list" with selectable cards; below, "Metadata preview" panel for the selected dataset: satellite, channel/wavelength, level, number of frames, time range (UTC), detected cadence (e.g. 10 min), gaps (list), grid shape, grid consistent (yes/no), invalid-pixel %, units (K), BT min/mean/max, licence/attribution note. Below that, a frame filmstrip (thumbnail strip) with a large preview and BT colour bar; hovering shows pixel BT in K.
VALIDATION: only .nc/.h5; max size shown (e.g. 2 GB limit); local path must be non-empty; end time after start time; ROI integers with y1>y0, x1>x0 within frame size; show inline errors and an error summary.
STATES: Empty drop zone with instructions; Uploading with progress bars and cancel; Validation error list per file (e.g. "Grid mismatch", "Unsupported file"); Success toast "Dataset registered" and card appears; Loading skeleton for metadata.
BUTTONS: "Register dataset" (primary), "Remove", "Open in Run".
NOTE: The "Fetch GOES-19" tab is OPTIONAL; label it "Requires internet".
RESPONSIVE: columns stack; filmstrip scrolls horizontally.
ACCESSIBILITY: drop zone is also a button for keyboard users; announce validation results to screen readers.
```

### S3 — Interpolation configuration and job execution
```
SCREEN: Run (route "/run").
LAYOUT: Left (form, 2/3): sections as accordions — (1) Input: dataset select, sequence/time range select; (2) Engine: radio cards "Blend (baseline)", "Flow-warp (classical optical flow)", "RIFE (pretrained)", "RIFE (fine-tuned)" [disabled with tooltip if weights missing]; engine options panel that changes with selection: flow method (DIS / Farneback) for Flow-warp; tile size (512/1024), overlap, scale (0.5/1.0), invert polarity checkbox for RIFE; (3) Temporal: "Levels" segmented control "×2 (e.g. 30→15 min)" / "×4 (e.g. 30→7.5 min, recursive)" with a warning that level 2 is not validated; (4) Region: ROI inputs or "Use full frame"; (5) Validation: protocol select "None", "P1 hold-out (20→10 min GOES)", "P4 hold-out (60→30 min INSAT)", max triplets number; (6) Display: BT range (default 180–330 K), colour map. Right (1/3): "Summary" card (selected dataset, frames in, expected frames out, estimated runtime shown as "Estimate", device) and primary button "Run job". Below: "Job progress" card appearing after submit — stepper (Load → Preprocess → Interpolate → Write NetCDF → Evaluate → Done), progress bar, live log lines (monospace), buttons "Cancel" and "Open viewer" (enabled on success).
VALIDATION: dataset required; ROI within bounds; tile ≥ 256; overlap < tile/2; protocol P1/P4 only enabled when dataset cadence allows (show reason otherwise); BT min < max.
STATES: Idle; Submitting; Running (progress + SSE log); Cancelling; Success (toast + CTA to Viewer); Failed (error code, message, "View details", "Edit and rerun"); GPU not available → inline info "Running on CPU".
RESPONSIVE: summary card moves above form on mobile; sticky "Run job" bar at the bottom.
ACCESSIBILITY: form labels, helper text linked via aria-describedby; progress announced via aria-live=polite.
```

### S4 — Animation viewer with synchronized playback
```
SCREEN: Viewer (route "/viewer/:jobId").
LAYOUT: Banner (synthetic warning). Header with job chip and mode tabs: "Original vs Interpolated" | "Ground truth vs Interpolated" (disabled with tooltip if no ground truth) | "Interpolated only". Main: two equal image panels side by side — left "Original/Observed sequence", right "Interpolated sequence (observed + synthetic frames)". Each panel has a title bar (timestamp UTC, frame index, badge OBSERVED / SYNTHETIC L1 / SYNTHETIC L2), the image, a shared kelvin colour bar, and a pixel-probe readout. Under the panels: a shared timeline scrubber with tick marks — filled teal ticks for observed frames, amber ticks for synthetic frames — plus time labels; playback controls: previous, play/pause, next, step ±1 frame, speed (0.25×–4×), loop toggle, "sync panels" toggle (on by default), fullscreen. Side drawer (collapsible): "Frame list" with type badges and "Jump to".
DATA: frame list from API (id, UTC time, type, level), rendered PNGs.
INTERACTIONS: Space = play/pause; ←/→ = step; [ ] = speed; click on timeline = seek; clicking a frame in the drawer seeks both panels; pixel hover shows BT (K) and row/col; "Download current frame" icon.
STATES: Loading — skeleton panels and a "Prefetching frames n/N" progress; Empty — "No frames for this job"; Error — failed frame fetch with retry; Success — playing. If ground truth is unavailable for the selected tab, show an explanatory notice.
RESPONSIVE: panels stack vertically below 1024 px with a segmented control to switch which panel is shown when below 768 px; controls in a sticky bottom bar.
ACCESSIBILITY: canvas has aria-label updating with frame time and type; controls are buttons with labels; honour prefers-reduced-motion (do not autoplay).
```

### S5 — Original vs interpolated frame comparison
```
SCREEN: Compare (route "/compare/:jobId").
LAYOUT: Frame selector at top (dropdown of timestamps + prev/next + "Jump to worst-error frame" button, enabled only when ground truth exists). Main area with tabs: "Side by side", "Slider", "Flicker (A/B)". Side by side: three panels — Previous observed frame, Interpolated frame (or ground truth when available toggle), Next observed frame — with synchronized zoom/pan (mouse wheel, drag, +/- buttons, reset). Slider: one image area with a draggable vertical divider between "Observed (ground truth)" and "Interpolated". Flicker: auto-alternating A/B with adjustable rate (max 2 Hz, off by default). Right sidebar: "Frame info" (timestamps, interpolation fraction t, engine, flow magnitude summary) and a "Motion vectors" toggle that overlays arrows or an HSV flow image (only if the job used a flow engine; otherwise disabled with explanation). Sync zoom toggle; colour map and range controls.
STATES: Loading; Empty when no triplet selected; Error with retry; "Ground truth unavailable for this frame" notice instead of the slider.
RESPONSIVE: tabs remain; side-by-side becomes a horizontal scroller; sidebar becomes a bottom sheet.
ACCESSIBILITY: slider divider is a keyboard-operable slider (←/→) with aria-valuenow; flicker mode off by default and warns about flashing.
```

### S6 — Difference map and validation metrics
```
SCREEN: Metrics (route "/metrics/:jobId").
LAYOUT: Protocol bar: protocol chip (e.g. "P1 hold-out"), N triplets, dates, ROI, normalisation range, mask selector (All valid / Dynamic pixels / Cold clouds <235 K). Row 1 metric tiles: MAE (K), RMSE (K), Bias (K), PSNR (dB, fixed 150 K range), SSIM, FSIM, Skill vs Blend — each with an info popover and a delta vs baseline chip. Row 2 left: "Difference map" viewer — diverging blue/orange map (prediction minus observation) with symmetric scale (default ±10 K, adjustable), colour bar in K, frame selector, histogram of differences below. Row 2 right: "Pred vs observed" density scatter plot with 1:1 line. Row 3: "Per-triplet error" chart (line/bar by time) and "Error vs motion magnitude" chart; a "Chart / Table" toggle on each. Row 4: "Spectral & temporal checks": radial power spectrum chart (pred vs observed), flicker metric tile. Row 5: "Baseline comparison" table (Blend, Flow-warp DIS, RIFE, RIFE fine-tuned) with bootstrap 95% CI columns and best value highlighted (also bolded, not colour only). Footnote area "Limitations of these metrics".
STATES: Loading skeleton; Empty — "No ground truth. Run a validation protocol in Run." with button; partial — metrics requiring GT disabled with reasons; Error with retry.
RESPONSIVE: tiles 7→4→2→1 columns; charts stack; tables scroll horizontally.
ACCESSIBILITY: charts have table view alternative, descriptive aria-labels, non-colour encodings; diverging legend states meaning in text.
```

### S7 — Model and experiment comparison
```
SCREEN: Experiments (route "/experiments").
LAYOUT: Left filters (protocol, dataset/split, engine, date) and a list of experiments with checkboxes (EXP id, engine, key options, protocol, N). Main: when 2–4 selected, show a comparison table (rows = metrics, columns = experiments, best highlighted and bold, CI shown), a grouped bar chart for MAE/RMSE (K) and a radar-free alternative "parallel dot plot" for SSIM/FSIM/skill, and a "Config diff" panel highlighting changed options between experiments. Buttons: "Compare", "Clear", "Open job", "Set as default engine for Run" (functional).
VALIDATION: Warn when selected experiments use different protocols/splits ("Not directly comparable"). Limit 4 selections.
STATES: Empty list message; Loading; Error; Warning banner for non-comparable selection.
RESPONSIVE: filters collapse to a drawer; table scrolls horizontally.
ACCESSIBILITY: checkboxes labelled; table sortable with aria-sort.
```

### S8 — Results export and report generation
```
SCREEN: Export & Report (route "/export/:jobId").
LAYOUT: Left: "Exports" list of checkable items — NetCDF (.nc, FrameFill-NC with synthetic flags), PNG frames (.zip), Animation (GIF), Animation (MP4), Metrics (CSV), Config snapshot (JSON) — each with size estimate and a notice for .nc "Contains synthetic frames flagged in frame_type". Right: "Report" card with options — format (HTML / PDF [PDF optional]), include sections (Setup, Quantitative results, Plots, Qualitative examples, Limitations — Limitations always included and locked), title field, author field. Buttons: "Build selected exports", "Generate report". Below: "History" table of generated files (name, type, size, created, status, Download).
VALIDATION: at least one item selected; title ≤ 120 chars; if no ground truth, metric sections are auto-disabled with an explanation.
STATES: Idle; Building (progress per item); Ready (download buttons); Failed (error and retry); Empty history.
RESPONSIVE: stacked cards.
ACCESSIBILITY: checkbox group with fieldset/legend; progress announced via aria-live.
```

### S9 — System architecture and project information
```
SCREEN: About (route "/about").
LAYOUT: Tabs: "How it works", "Architecture", "Data & licences", "Limitations", "Version". How it works: a 5-step horizontal flow diagram (Ingest → Preprocess → Interpolate → Validate → Visualise) with short descriptions. Architecture: a static block diagram (Sources → Core modules M1–M8 → API → Dashboard) [VISUAL ONLY]. Data & licences: table of sources (NOAA GOES-19, MOSDAC/INSAT, optional Himawari) with attribution text and terms notes. Limitations: bullet list (synthetic frames are estimates; cannot represent non-advective cloud change; INSAT 15/7.5-min outputs lack ground truth; research prototype). Version: app version, API version, model weights and git commit from the API, plus links to the model card and documentation.
STATES: Loading for version info; Error shows "Version unavailable".
RESPONSIVE: tabs scroll; diagram scales.
ACCESSIBILITY: diagram has text alternative list.
```

---

## Part D — Frontend component hierarchy

```
<App>
 ├─ <ThemeProvider/>  <QueryClientProvider/>  <Router/>
 ├─ <AppShell>
 │   ├─ <TopBar> <Logo/> <DatasetChip/> <JobChip/> <ThemeToggle/> <HelpMenu/> </TopBar>
 │   ├─ <SideNav items=S1..S9/>  (<BottomNav/> on mobile)
 │   └─ <SyntheticBanner/> (S4–S8)
 ├─ pages/
 │   ├─ OverviewPage: <SummaryCards/> <RecentJobsTable/> <QuickStart/> <SystemStatus/>
 │   ├─ DatasetsPage: <AddDataTabs>(<UploadZone/> <LocalPathForm/> <FetchGoesForm/>) <DatasetList/> <MetadataPanel/> <Filmstrip/> <FramePreview/>
 │   ├─ RunPage: <RunForm>(<InputSection/> <EngineSection/> <TemporalSection/> <RegionSection/> <ValidationSection/> <DisplaySection/>) <RunSummary/> <JobProgress/> <LogStream/>
 │   ├─ ViewerPage: <ModeTabs/> <FramePanel/>×2 <ColorBar/> <PixelProbe/> <Timeline/> <PlaybackControls/> <FrameDrawer/>
 │   ├─ ComparePage: <FrameSelector/> <CompareTabs>(<SideBySide/> <SliderCompare/> <FlickerAB/>) <FrameInfo/> <FlowOverlay/>
 │   ├─ MetricsPage: <ProtocolBar/> <MetricTiles/> <DiffMapViewer/> <DiffHistogram/> <ScatterPlot/> <PerTripletChart/> <ErrorVsMotion/> <SpectrumChart/> <BaselineTable/>
 │   ├─ ExperimentsPage: <ExperimentFilters/> <ExperimentList/> <ComparisonTable/> <MetricBars/> <ConfigDiff/>
 │   ├─ ExportPage: <ExportList/> <ReportForm/> <ExportHistory/>
 │   └─ AboutPage: <HowItWorks/> <ArchitectureDiagram/> <LicencesTable/> <Limitations/> <VersionInfo/>
 ├─ shared/: <Badge/> <MetricTile/> <DataTable/> <Chart/> <Banner/> <FormField/> <Slider/> <Toast/> <Modal/> <Skeleton/> <EmptyState/> <ErrorState/>
 ├─ hooks/: useJob(id) [SSE] · useFrames(id) · usePlayback() · useMetrics(id) · useSystemInfo()
 └─ api/: generated client from OpenAPI (types for Dataset, Job, Frame, Metric, Experiment, Export)
```
State: server state via TanStack Query; UI state via local state/Zustand; playback state in a dedicated hook with `requestAnimationFrame` timing and image prefetch.

---

## Part E — Functional vs placeholder summary

| Screen | Functional (needs backend) | [VISUAL ONLY] |
|---|---|---|
| S1 | Counts, recent jobs, system info | Branding illustration (none) |
| S2 | Upload, register path, metadata, previews; fetch GOES (optional) | — |
| S3 | Form → job, progress, cancel | Runtime estimate until benchmarks exist (labelled "Estimate") |
| S4 | Frame list, images, playback (client), GT mode when GT exists | — |
| S5 | Frame images, diff, flow overlay when available | — |
| S6 | Metrics, diff map, charts | — |
| S7 | List, compare, set default engine | Radar/other decorative charts (not used) |
| S8 | Exports, report build, history | PDF (optional) |
| S9 | Version info | Architecture diagram |

---

## Part F — UI control → backend mapping

| UI control | Screen | API / function | Notes |
|---|---|---|---|
| Summary cards, system status | S1 | `GET /system/info`, `GET /jobs`, `GET /health` | `GET /jobs` list endpoint to be added to Doc 23 (listed in audit) |
| Upload zone | S2 | `POST /datasets` | Multipart; size limit |
| Local path | S2 | `POST /datasets/register` | Server-side path, allow-listed root |
| Fetch GOES-19 | S2 | `POST /datasets/fetch` → job | Optional; needs internet |
| Metadata panel | S2 | `GET /datasets/{id}` | cadence, gaps, grid check |
| Filmstrip/preview | S2 | `GET /datasets/{id}/frames/{fid}/preview` | `cmap`, `vmin`, `vmax` |
| Run job | S3 | `POST /jobs` | Body per Doc 23 |
| Progress/log | S3 | `GET /jobs/{id}`, `GET /jobs/{id}/events` | SSE |
| Cancel | S3 | `DELETE /jobs/{id}` | |
| Frame list/timeline | S4 | `GET /jobs/{id}/frames` | |
| Frame images | S4, S5 | `GET /jobs/{id}/frames/{fid}/image` | PNG |
| Playback controls | S4 | client-side (`usePlayback`) | |
| Flow overlay | S5 | `GET /jobs/{id}/flow/{fid}` | Only for flow engines |
| Difference map | S5, S6 | `GET /jobs/{id}/frames/{fid}/diff` | |
| Metrics tiles/charts/tables | S6 | `GET /jobs/{id}/metrics` | |
| Experiments list/compare | S7 | `GET /experiments`, `POST /experiments/compare` | |
| Set default engine | S7 | client setting (local) → pre-fills S3 | |
| Build exports | S8 | `POST /jobs/{id}/exports`, `GET /exports/{id}` | |
| Generate report | S8 | `POST /jobs/{id}/report` | |
| Version info | S9 | `GET /system/info` | |
