# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm run dev      # Vite dev server with HMR
npm run build    # Production build to /dist
npm run preview  # Preview the production build locally
```

No linting or test framework is configured.

## Architecture

This is a **Vue 3 + Vite plugin** that integrates as a window panel inside Disguise Designer (a professional media server application). The plugin allows users to batch-create video layers on a timeline with configurable settings.

**Key integration point:** Designer exposes a Python Execute REST endpoint (`/api/session/python/execute`). The frontend dynamically constructs Python scripts and POSTs them to this endpoint — there is no static backend. The `director` hostname is injected via URL query param (`?director=localhost:80`) and passed from `App.vue` down to `MediaSequencer.vue`.

### Component / Service Breakdown

- **`App.vue`** — Reads `?director=` from the URL and passes it as a prop. Entry point only.
- **`src/components/MediaSequencer.vue`** — The entire application UI (~1900 lines). Three-column layout: collapsible/resizable folder tree sidebar | media card grid | settings panel. Manages all state using Vue 3 Composition API (`ref`, `reactive`, `computed`, `watch`). Planned to be split into components and composables; see `docs/PLAN-ui-redesign.md` §4.1.
- **`src/components/MediaCard.vue`** — Individual media tile. Thumbnails are fetched from `http://{director}/api/v1/thumbnail/{uid}`.
- **`src/services/disguiseService.js`** — All Designer API calls. Each function generates a Python script string and executes it via REST. Returns parsed JSON results. This is where `VideoClip`, `Projection`, and `Track` resources are fetched and where the layer-creation script is assembled.
- **`src/api_scripts.py`** — Reference/template file for the Python API. Not imported at runtime; used as documentation for what Python calls are available.

### Data Flow for Layer Creation

1. User selects media cards (files from the media hierarchy)
2. User configures settings (mapping, mode, end behavior, overlap, cue tags, etc.)
3. On "Create Layers", `disguiseService.createLayers()` builds a multi-step Python script that:
   - Loads each selected resource
   - Calculates beat positions from the current playhead or a specified time
   - Creates a layer per media item with `track.addNewLayer()`
   - Optionally splits sections, adds cue tags, and animates brightness
4. The script is POSTed to Designer's Python Execute endpoint

### Media Hierarchy

Resources arrive as flat paths like `objects/videoclip/folder/subfolder/clip.apx`. `disguiseService.getMediaList()` parses these into a nested folder tree. The UI renders the tree in the sidebar and the current folder's files as cards in the grid.

### Settings State Shape

The settings panel binds to a `reactive` object with these key fields: `insertMode`, `startTime` (HH:MM:SS:FF), `targetTrack`, `mode` (Normal/Locked), `atEndPoint` (Loop/Ping-Pong/Pause), `stillDuration`, `fitToContent`, `movieDuration`, `overlap`, `splitSection`, `addCueTag`, `cueValue`, `animateBrightness`, `brightnessDuration`.

## Docs, skills and tooling

- **`docs/PLAN-ui-redesign.md`** — implementation plan for the Layer Plan redesign: Simple/Advanced
  modes, groups, per-layer mappings, settings inheritance, groups from folders, alpha/audio
  badges. §11 lists the owner's decisions; §12 lists API findings verified on a live Designer.
  Plan documents are always written in English.
- **`.claude/skills/disguise-api/`** — Designer Python API reference for this project. Load it
  before touching `disguiseService.js` or writing Python. `references/d3.pyi` holds the official
  type stubs; grep it, never read it whole.
- **`.claude/skills/disguise-css/`** — the colour palette and component styles. Load it before
  writing CSS.
- **`tools/designer-probes/`** — runs Python probes and write tests against a live Designer
  (`node tools/designer-probes/run.mjs`). Use it to verify an API assumption before relying on
  it. See its README.

## Non-obvious Constraints

- **Time format**: Timeline times use `HH:MM:SS:FF` (frames, not milliseconds). Conversion to beats happens in `disguiseService.js` via `track.timeToBeat()`.
- **Base path**: `vite.config.js` sets `base: './'` so asset paths are relative — required for the plugin to load resources when served from Designer's local file server.
- **Python script generation**: Since scripts are strings built via template literals, be careful with escaping and with variable naming collisions inside the generated Python. The script runs in Designer's Python interpreter, not Node.
- **No TypeScript**: The project uses plain JS. `api_scripts.py.d.ts` provides type hints for the Python loader integration only.
- **Designer Python runtime limits** (verified on a live session; details in the `disguise-api` skill):
  - Python 2.7;
  - ~1 s execution timeout, and **nothing rolls back** on timeout, so create layers in chunks
    of ≤100 per call;
  - never poll the execute endpoint;
  - touching `Action` objects or a failing `open()` raises errors that `try/except` cannot catch.
- **Timeline gotchas** (verified):
  - the track is **not** extended automatically; layers past `lengthInBeats` end up truncated
    or zero-length. Today's `createLayers` has this bug, and it is fixed in the redesign;
  - `addNewLayer` puts each new layer at the top of the stack;
  - Designer pre-fills a mapping on every new layer;
  - layer sequences are `layer.fields`, not `layer.sequences`.
- **Media metadata:** `VideoAsset.hasAlpha` is wrong for still images. Use the rules in
  `tools/designer-probes/probes/10_media_details.py`.
