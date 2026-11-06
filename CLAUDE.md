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

This is a **Vue 3 + Vite plugin** that integrates as a window panel inside Disguise Designer (a professional media server application). The plugin batch-creates video layers on a timeline. It has two modes:
- **Simple**: the selected files become layers one after another, with one mapping and one set of settings (the 1.1.x workflow);
- **Advanced**: a **Layer Plan** of groups. Each group has its own timing and settings, each layer its own mapping, and settings inherit Plan defaults → group → layer. Groups are built by dragging files or folders onto the plan, from checked folders in the tree, or with "Add to group…".

**Key integration point:** Designer exposes a Python Execute REST endpoint (`/api/session/python/execute`). The frontend dynamically constructs Python scripts and POSTs them to this endpoint - there is no static backend. The `director` hostname is injected via URL query param (`?director=localhost:80`) and passed from `App.vue` down to `MediaSequencer.vue`.

**Run on (director or editor):** in a d3net session with editors (Designer workstations, role 5
`MobileEditor`), "Run on" in the Where section picks the machine that runs the **writes**
(`createLayerPlan`, `createTrack`). Every machine runs its own Python, so "At Playhead" uses
that machine's open track and playhead; edits reach the whole session at once. **Reads**
(media, details, mappings, tracks, thumbnails) always go to the director. The plugin page is
always served by the director, so the default is the director. Details and live-session
results: `docs/PLAN-execution-target.md`.

### Component / Service Breakdown

- **`App.vue`** - Reads `?director=` from the URL (without it: the host that served the page; `localhost:80` under the Vite dev server) and passes it as a prop. Entry point only.
- **`main.js`** - Mounts the app and imports the bundled Inter font (`@fontsource/inter`, latin + cyrillic, 400-700): no external font request, show networks are often offline.
- **`src/components/MediaSequencer.vue`** - Shell: loads data, owns the creation mode and workspace layout (Files / Split / Plan; in Split the files pane is resized with the handle next to the plan, 260 to 420 px, remembered, double click resets), navigation, file and plan selection, the armed mapping and the missing-clip check (`isMissingClip`); wires the panels, runs layer creation, shows toasts.
- **`src/components/tree/`** - `FolderTree.vue` (collapsible/resizable tree with file counts; in Advanced, folder checkboxes for groups from folders) and `FolderGroupsStrip.vue` (content mode, insert position, Create groups).
- **`src/components/files/FilesPane.vue`** + **`MediaCard.vue`** - Breadcrumb, search, refresh, one-row selection toolbar ("Add to group…" in Advanced), grid/list of cards with marquee selection and dragging into the plan. Cards show thumbnails (`http://{director}/api/v1/thumbnail/{uid}`), duration, type (VIDEO/IMAGE/LIVE), alpha/audio icons, plan group badges, and a MISSING badge (not selectable) for clips whose media was deleted.
- **`src/components/plan/`** - the Advanced Layer Plan:
  - `LayerPlan.vue`: header (Auto-assign, Plan defaults, + Group), group nav, drop zones that create groups, the floating selection / armed-mapping bar ("Assign to all");
  - `PlanGroup.vue`: group header with mini timeline and markers, settings chips, layer rows with mapping slots, row / file / folder / mapping drag and drop, and the header as the grab handle for reordering groups;
  - `ChipRow.vue` + `SettingChip.vue` + `ChipPopover.vue` + `SettingEditor.vue`: the settings chips (fold into "+N" when narrow) and their editor popover;
  - `PlanDefaults.vue` (settings every group inherits, override counts), `AutoAssign.vue` (mappings by file name or resolution), `NumStepper.vue`.
- **`src/components/settings/`** - `SettingsPanel.vue` (plugin version next to the title, from `package.json` via the `__APP_VERSION__` define in `vite.config.js`; mode switch, collapsible sections via `SettingsSection.vue`: mappings, where to insert (with "Run on" when the session has editors), layer settings in Simple, timeline markers; validation, track picker, create-track, Create with confirmation for unmapped / missing layers); `MappingsPanel.vue` (Advanced mapping list: filter, type chips, drag or click to arm).
- **`src/components/common/`** - `Toast.vue` (with an optional Undo action), `WorkspaceSwitch.vue`, `InfoTip.vue`, `MenuSelect.vue` (the styled dropdown used instead of native `<select>`).
- **`src/composables/`**:
  - `useMediaLibrary` (load/refresh hierarchy, media details, mappings, tracks; reports non-blocking failures through `onError`);
  - `useSessionMachines` ("Run on": session machines from the director, the chosen editor remembered by hostname per director, reachability and Locked / Independent per editor; read on load, Refresh and menu open, never polled);
  - `useLayerPlan` (plan state and every plan operation: groups, entries, inheritance, mappings, Undo restores);
  - `usePlanStorage` (the plan in localStorage per director, schema-versioned);
  - `usePlanSelection` (plan row selection), `useFileSelection` (click/Ctrl/Shift/marquee, locked missing files), `useFolderSelection`;
  - `useLayerOptions` (settings-panel options), `useDragPayload` (one reactive drag payload: files / rows / folders / mapping), `usePersistedRef` (localStorage prefs), `usePaneResize` (drag handle on a pane's right edge with pointer capture: folder tree, Split files pane), `useToast`.
- **`src/utils/`**:
  - `planSchema` (Plan defaults, chip definitions, inheritance and override normalisation, saved-plan serialisation);
  - `planLayout` (UI time layout in seconds and marker positions, same rules as `plan_prepare.py`);
  - `planBuilder` (UI state → createLayerPlan payload, Simple and Advanced);
  - `autoAssign`, `mappingColors` (12-colour mapping set), `mediaTree` (tree helpers, groups from folders), `tagInputs` (cue/MIDI masks), `timecode`, `format`.
- **`src/services/disguiseService.js`** - All Designer API calls via `executePython`. Non-trivial Python lives in **`src/services/python/*.py`**, imported with `?raw`; scripts read input through `json.loads(__ARGS__)` (filled by `runScript`). The same files run as probes: `node tools/designer-probes/run.mjs src/services/python/<name>` (args templates need `__ARGS__` substituted):
  - `media_details.py` (per-clip kind, duration, resolution, alpha, audio, missing; opens no files, stills that need a header read get `alphaPending`), `still_alpha.py` (alpha of those stills from their file headers, in chunks with a time budget; `getStillAlpha()`, run by `useMediaLibrary` after the details), `mapping_list.py`;
  - `session_machines.py` (every machine of the session, run on the director); `checkMachine()` and `isLockedToDirector()` ask the machine itself;
  - `track_create.py` (`createTrack()`; the name is checked by `trackNameError()` in the service and the UI, and again in Python).
  - User data never goes into a script source: always JSON through `runScript()`. `pythonJsonLiteral()` escapes non-ASCII and spaces (Designer turns every 4 spaces of a script into a tab).
  - `plan_prepare.py`, `plan_layers.py`, `plan_markers.py` (the three createLayerPlan steps).

### Settings inheritance (Advanced)

`utils/planSchema.js`: **Plan defaults → group overrides (`group.ov`) → layer overrides (`entry.ov`)**.
Group-only keys: timing / overlap, tag placement, split placement. Layer keys: mode, end, fade,
length. An override equal to its parent is never stored (`pruneOverrides`), so the ◆ marker only
shows real differences. The tag and split *switches* and the insert location are global (settings
panel); groups only choose where markers go ("Each file" / "Group start").

### Data Flow for Layer Creation

1. User selects media cards (Simple) or builds the Layer Plan (Advanced), and configures settings.
2. `utils/planBuilder` turns the UI state into a **plan** payload (insert location, global
   tag/split switches, groups → layers with their effective settings):
   - `buildSimplePlan()`: the selected clip paths as one sequential group with one mapping;
   - `buildAdvancedPlan()`: one payload group per plan group with its effective timing and
     marker placement, each layer with its own mapping (none = cleared); rows with a missing
     clip are skipped, empty groups dropped.
3. `disguiseService.createLayerPlan()` runs three steps against Designer, all on the "Run on"
   machine (`useSessionMachines().targetHost`, checked right before; an unreachable editor
   blocks Create instead of falling back to the director):
   - `plan_prepare.py` (read-only): resolves the track, computes every layer's start/length in
     track beats, tag texts/positions and split positions, and the required track length;
   - `plan_layers.py` in chunks of ≤100 (`LAYER_CHUNK_SIZE`): extends the track first, then creates
     layers and sets video/mapping/mode/end/brightness;
   - `plan_markers.py`: section splits, then tags, in chunks of ≤300 (`MARKER_CHUNK_SIZE`).
4. Progress is reported per chunk; partial creation is reported in the error (Designer rolls back
   only the failed call, the chunks before it stay).
   Advanced keeps the plan after Create, so it can be tweaked and created again.

### Media Hierarchy

Resources arrive as flat paths like `objects/videoclip/folder/subfolder/clip.apx`. `disguiseService.getMediaList()` parses these into a nested folder tree. The UI renders the tree in the sidebar and the current folder's files as cards in the grid. Plan entries reference clips by **path**, so the plan survives a Refresh: after a Refresh (or a restored plan) rows whose clip is gone are flagged "missing" and skipped by Create, and mappings that no longer exist are cleared with a toast.

### State shapes

- **Settings panel** (`useLayerOptions`, a `reactive` object): `insertMode`, `startTime` (HH:MM:SS:FF), `mode` (Normal/Locked), `atEndPoint` (Loop/Ping-Pong/Pause), `stillDuration`, `fitToContent`, `movieDuration`, `overlap`, `splitSection`, `addTimecodeTag`, `timecodeStart`, `timecodeIncrement`, `addCueTag`, `cueValue`, `addMidiNote`, `midiNoteValue`, `animateBrightness`, `brightnessDuration`. The track and Simple mapping are picked inside the panel and added on `create`.
- **Layer plan** (`useLayerPlan().state`): `plan` (Plan defaults), `groups: [{ id, name, open, scope, ov, items: [entryId], sourceFolder }]`, `entries: { [entryId]: { mediaId: clipPath, mappingPath, via, ov } }`. Saved to localStorage as `mediaSequencer.plan.<director>` (`PLAN_SCHEMA_VERSION`; a mismatch resets with a toast).

## Docs, skills and tooling

- **`docs/PLAN-ui-redesign.md`** - implementation plan for the Layer Plan redesign: Simple/Advanced
  modes, groups, per-layer mappings, settings inheritance, groups from folders, alpha/audio
  badges. §11 lists the owner's decisions; §12 lists API findings verified on a live Designer.
  Plan documents are always written in English.
- Skills come from the `disguise` plugin of the owner's `my-skills` marketplace
  (github.com/zap-syr/my-skills), not from this repo:
  - **`disguise-api`** - Designer Python and REST API reference. Load it before touching
    `disguiseService.js` or writing Python. `references/d3.pyi` holds the official type stubs;
    grep it, never read it whole.
  - **`disguise-css`** - the colour palette and component styles. Load it before writing CSS.
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
- **No TypeScript**: The project uses plain JS. The `.py` scripts are imported with `?raw` (no Python loader).
- **ASCII only in `.py` files**, comments included (Designer runs them as Python 2.7).
- **Designer Python runtime limits** (verified on a live session; details in the `disguise-api` skill):
  - Python 2.7;
  - ~1 s execution timeout. A call that raises or times out is **rolled back**, but earlier calls
    stay, and the timeout does not stop an unbounded loop: create layers in chunks of ≤100 per
    call and bound every loop;
  - never poll the execute endpoint;
  - **`except Exception` catches nothing**: `Exception` is `d3.Exception` in Designer scripts.
    Use `import __builtin__` + `except __builtin__.Exception:` or a concrete class
    (`ValueError`, `IndexError`, ...). Still never touch `Action` objects.
- **Timeline gotchas** (verified):
  - the track is **not** extended automatically; layers past `lengthInBeats` end up truncated
    or zero-length. `plan_layers.py` extends the track before creating;
  - `addNewLayer` puts each new layer at the top of the stack;
  - Designer pre-fills a mapping on every new layer;
  - layer sequences are `layer.fields`, not `layer.sequences`.
- **Media metadata:** `VideoAsset.hasAlpha` is wrong for still images. Use the rules in
  `src/services/python/media_details.py`.
- **Deleted media:** a clip whose media file is deleted in Designer stays in
  `allResources(VideoClip)` with its old metadata; only `VideoClip.isInError` turns True
  (`media_details.py` returns it as `missing`). Don't rely on the hierarchy alone to detect it.
