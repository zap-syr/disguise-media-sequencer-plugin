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

**Key integration point:** Designer exposes a Python Execute REST endpoint (`/api/session/python/execute`). The frontend dynamically constructs Python scripts and POSTs them to this endpoint - there is no static backend. The `director` hostname is injected via URL query param (`?director=localhost:80`) and passed from `App.vue` down to `MediaSequencer.vue`.

### Component / Service Breakdown

- **`App.vue`** - Reads `?director=` from the URL and passes it as a prop. Entry point only.
- **`src/components/MediaSequencer.vue`** - Shell: loads data, owns navigation/selection state, wires the panels, runs layer creation, shows toasts.
- **`src/components/tree/FolderTree.vue`** - Collapsible/resizable folder tree with file counts.
- **`src/components/files/FilesPane.vue`** + **`MediaCard.vue`** - Breadcrumb, search, refresh, selection toolbar, grid/list of cards with marquee selection. Cards show thumbnails (`http://{director}/api/v1/thumbnail/{uid}`), duration, type (VIDEO/IMAGE/LIVE), alpha/audio icons.
- **`src/components/settings/SettingsPanel.vue`** - All layer/insert/tag options, validation, mapping/track pickers, create-track, Create button. Emits `create` with the options.
- **`src/composables/`** - `useMediaLibrary` (load/refresh hierarchy, media details, mappings, tracks), `useFileSelection` (click/Ctrl/Shift/marquee), `usePersistedRef` (localStorage prefs), `useToast`.
- **`src/utils/`** - `mediaTree` (tree helpers), `planBuilder` (UI options → createLayerPlan payload), `tagInputs` (cue/MIDI masks), `timecode`, `format`.
- **`src/services/disguiseService.js`** - All Designer API calls via `executePython`. Non-trivial Python lives in **`src/services/python/*.py`**, imported with `?raw`; scripts read input through `json.loads(__ARGS__)` (filled by `runScript`). The same files run as probes: `node tools/designer-probes/run.mjs src/services/python/<name>` (args templates need `__ARGS__` substituted).
- **`src/api_scripts.py`** - Old reference/template file for the Python API (pre-redesign). Not imported at runtime.

### Data Flow for Layer Creation

1. User selects media cards and configures settings.
2. `utils/planBuilder.buildSimplePlan()` turns options + selected clip paths into a **plan**
   (insert location, global tags/split switches, groups → layers). Simple mode = one sequential group.
3. `disguiseService.createLayerPlan()` runs three steps against Designer:
   - `plan_prepare.py` (read-only): resolves the track, computes every layer's start/length in
     track beats, tag texts/positions and split positions, and the required track length;
   - `plan_layers.py` in chunks of ≤100 (`LAYER_CHUNK_SIZE`): extends the track first, then creates
     layers and sets video/mapping/mode/end/brightness;
   - `plan_markers.py`: tags and section splits.
4. Progress is reported per chunk; partial creation is reported in the error (Designer never rolls back).

### Media Hierarchy

Resources arrive as flat paths like `objects/videoclip/folder/subfolder/clip.apx`. `disguiseService.getMediaList()` parses these into a nested folder tree. The UI renders the tree in the sidebar and the current folder's files as cards in the grid.

### Settings State Shape

The settings panel binds to a `reactive` object with these key fields: `insertMode`, `startTime` (HH:MM:SS:FF), `targetTrack`, `mode` (Normal/Locked), `atEndPoint` (Loop/Ping-Pong/Pause), `stillDuration`, `fitToContent`, `movieDuration`, `overlap`, `splitSection`, `addCueTag`, `cueValue`, `animateBrightness`, `brightnessDuration`.

## Docs, skills and tooling

- **`docs/PLAN-ui-redesign.md`** - implementation plan for the Layer Plan redesign: Simple/Advanced
  modes, groups, per-layer mappings, settings inheritance, groups from folders, alpha/audio
  badges. §11 lists the owner's decisions; §12 lists API findings verified on a live Designer.
  Plan documents are always written in English.
- **`.claude/skills/disguise-api/`** - Designer Python API reference for this project. Load it
  before touching `disguiseService.js` or writing Python. `references/d3.pyi` holds the official
  type stubs; grep it, never read it whole.
- **`.claude/skills/disguise-css/`** - the colour palette and component styles. Load it before
  writing CSS.
- **`tools/designer-probes/`** - runs Python probes and write tests against a live Designer
  (`node tools/designer-probes/run.mjs`). Use it to verify an API assumption before relying on
  it. See its README.

## Conventions

- **Punctuation:** never use the em dash or the middle dot characters in UI text, code, comments,
  docs or commit messages. Use " - ", ", " or ":" instead (e.g. "3 files, 55s", "G1, G3").
  The vendored `references/d3.pyi` is left as is.

## Non-obvious Constraints

- **Time format**: Timeline times use `HH:MM:SS:FF` (frames, not milliseconds). Conversion to beats happens in `disguiseService.js` via `track.timeToBeat()`.
- **Base path**: `vite.config.js` sets `base: './'` so asset paths are relative - required for the plugin to load resources when served from Designer's local file server.
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
    or zero-length. `plan_layers.py` extends the track before creating;
  - `addNewLayer` puts each new layer at the top of the stack;
  - Designer pre-fills a mapping on every new layer;
  - layer sequences are `layer.fields`, not `layer.sequences`.
- **Media metadata:** `VideoAsset.hasAlpha` is wrong for still images. Use the rules in
  `src/services/python/media_details.py`.
