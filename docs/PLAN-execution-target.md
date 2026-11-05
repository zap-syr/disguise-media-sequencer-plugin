# Plan: choose the machine that runs layer creation (Director or Editor)

Status: draft, waiting for the owner's decisions (§8).
Source: `disguise-api` skill 1.3.0, `references/d3net.md` -> "Talking to an editor machine",
`references/rest-api.md` -> "Sessions", `references/execution-api.md` -> "Undo".

## 1. Goal

A "Run on" control in the plugin that picks which machine of the d3net session executes the
Python that creates tracks and layers: the **Director** (today's behaviour) or one of the
**Editors** (Designer workstations joined to the session). The control appears only when the
session has at least one editor.

## 2. What the skill says (verified on r34.2.2)

1. **Every machine runs its own Python / Session REST.** A script sent to an editor runs on the
   editor and sees the editor's GUI state:
   - `guisystem.track` = the track open on that editor;
   - `guisystem.player.tCurrent` = that editor's playhead;
   - `guisystem.selectedLayers` and the timeline range selection are that editor's.
   Resources (clips, mappings, tracks) are the same on every machine (shared project).
2. **Edits made on an editor go into the shared project at once.** A layer created by `execute`
   on the editor was visible on the director in the next call (same extents, stack index, field
   values); deleting it on the editor deleted it on the director. A script that raised was
   rolled back on both machines.
3. **Editors are not in `GET /api/session/status/session`** (its `actors` / `understudies` were
   empty). Find them with `d3NetManager.machines`: role `5` = `MobileEditor`.
   `MachineRole`: `0 Solo`, `1 DedicatedDirector`, `2 NonDedicatedDirector`, `3 Actor`,
   `4 Understudy`, `5 MobileEditor`, `6 UnknownRole`, `7 RenderNode`.
4. **Addresses:** `Machine.hostname` and `Machine.IP_address`. The local machine reports
   `127.0.0.1`, so ask the director and use the host already called for the director itself.
   Hostnames also work (`http://d3-designer/`).
5. **Reachability:** Designer on a workstation serves its API on port 80 through bundled nginx.
   On a Windows PC, **IIS can hold port 80** and every `/api/...` returns 404 with
   `Server: Microsoft-IIS/10.0`. Check `GET http://<host>/api/session/status/project`
   (200 + JSON = OK; 404 from IIS, 502 or a timeout = no Designer API there).
6. **Locked vs Independent editor:** `state.lockedToDirector` (False = Independent). In Locked
   mode the editor's playhead follows the director, so "At Playhead" gives the same result on
   either machine; the difference matters in Independent mode.
7. A web plugin opened inside the editor's Designer still gets `?director=` = the director.
8. Enums: return `int(m.role)`, never `json.dumps` a d3 enum (r34.2+). Catch with
   `__builtin__.Exception`, not `Exception` (it is `d3.Exception`).

**Why this is useful for the plugin:** `plan_prepare.py` uses `guisystem.track` and
`guisystem.player.tCurrent` for **"At Playhead"**. Today an operator on an editor gets the
layers at the **director's** playhead on the **director's** open track. With "Run on: Editor",
"At Playhead" means the playhead and track the operator actually sees.

## 3. Which calls go where

| Call | Machine | Reason |
|---|---|---|
| `getMediaList`, `getMediaDetails`, `getMappingList`, `getTrackList` | Director (unchanged) | Shared resources, same answer everywhere; the director is always reachable |
| Thumbnails `/api/v1/thumbnail/{uid}` | Director (unchanged) | Same |
| `getSessionMachines` (new) | Director | Only the director knows every machine with a usable address |
| `createLayerPlan` (prepare, layers, markers) | **Target** | Uses the target's open track and playhead; the edits sync to the session |
| `createTrack` | **Target** | Write call; keep every write on one machine |

All three `createLayerPlan` steps must run on the **same** machine: `plan_prepare.py`
computes beats from that machine's playhead and track.

## 4. Implementation

### 4.1 Probe first (`tools/designer-probes/`)

Run against the live session with an editor before writing UI code:

- **P1** `session_machines.py` (the new script from §4.2) on the director: check the editor
  rows, `hostname`, `IP_address`, role values.
- **P2** CORS: the plugin page calls the director today; check that a `fetch` from the plugin
  origin to the **editor** host (execute + `status/project`) is not blocked by CORS.
- **P3** Where the plugin page is served from when the panel is opened inside the editor's
  Designer (`window.location.host`): the director or the editor. Needed for the auto-preselect
  idea (§8, Q4).
- **P4** `return {"locked": state.lockedToDirector, "editor": d3NetManager.mobileEditorMode}`
  on the editor, to show the Locked / Independent badge.
- **P5** End-to-end: run the existing `plan_prepare.py` + `plan_layers.py` on the editor with a
  2-layer plan, then confirm on the director that the layers exist (same extents and mapping).

Record the results in §9 of this file, as §12 does in `PLAN-ui-redesign.md`.

### 4.2 Service (`src/services/disguiseService.js`, `src/services/python/`)

- `executePython(host, script)` and `runScript(host, ...)`: rename the parameter from
  `directorIp` to `host` (the code already works with any host).
- New `src/services/python/session_machines.py`:
  ```python
  def run():
      n = d3NetManager
      return [{"name": m.name, "hostname": m.hostname, "ip": m.IP_address,
               "role": int(m.role), "isDirector": n.director == m,
               "isLocal": n.localMachine == m} for m in n.machines]
  return run()
  ```
- `getSessionMachines(directorHost)`: runs it and maps each row to
  `{ name, hostname, role, isDirector, isEditor: role === 5, host }`, where
  `host = isDirector ? directorHost : (ip && ip !== '127.0.0.1' ? ip : hostname)`. A solo
  project returns one row (or none); then the session has no editors.
- `checkMachine(host)`: `GET http://<host>/api/session/status/project` with a 2 s
  `AbortController` timeout; returns `ok` / `unreachable` / `not-designer` (non-JSON or IIS
  404) for a clear message.
- Optional `getEditorMode(host)`: P4 script, for the Locked / Independent badge.
- `createLayerPlan(host, ...)` and `createTrack(host, ...)`: no logic change; callers pass the
  target host.
- `plan_prepare.py`: the error "No track is selected in Designer" gets the machine name
  (`d3NetManager.localMachine.name`) so the operator knows where to select a track.

### 4.3 Composable `src/composables/useSessionMachines.js`

```
useSessionMachines(directorEndpoint, onError) -> {
  machines, editors,           // refs
  targetId,                    // persisted hostname, '' = director
  target, targetHost,          // computed; falls back to the director
  targetStatus,                // 'ok' | 'checking' | 'unreachable' | 'not-designer'
  refresh(), check()
}
```

- Loads with `library.load()` and on the Files pane Refresh, plus when the "Run on" menu
  opens. **No polling** (skill rule: the execute endpoint must never be polled).
- Persists the choice by **hostname** (IPs change) with `usePersistedRef`, key
  `mediaSequencer.runOn.<director>`, next to the plan key.
- If the saved editor is not in the session any more: fall back to the director and show a
  toast ("Editor d3-edit-2 is not in the session, running on the director").
- `check()` runs on selection and right before Create.

### 4.4 UI

- **Where:** the first row of the **"Where"** section of `SettingsPanel.vue`, above
  "At Playhead / Specific Time", because the target decides whose playhead and open track
  "At Playhead" uses. Label "Run on", a `MenuSelect` (never a native `<select>`):
  - `Director (d3-director)`;
  - one item per editor: `d3-edit-1`, with a small `Independent` / `Locked` tag when known.
  The section summary becomes "At playhead, d3-edit-1" when an editor is chosen.
- **Hidden** when the session has no editors; the plugin then looks exactly as now.
- Status next to the menu: a dot (OK / checking / unreachable) and an `InfoTip` with the
  reason, e.g. "No Designer API on port 80 at 192.168.0.5 (IIS may hold the port)".
- **Create button:** while the target is unreachable, Create is disabled with the reason in its
  tooltip. The confirmation and the success toast name the machine when it is not the director:
  "Created 12 layers on d3-edit-1".
- With "Specific Time" the target matters less (the track and time are explicit) but writes
  still go to the target, so all writes stay on one machine.
- Styles from the `disguise-css` skill; check at the minimal panel size (~900x560).

### 4.5 Wiring (`MediaSequencer.vue`)

- Create the composable next to `useMediaLibrary`; pass `targetHost` to
  `createLayerPlan(...)` in `handleCreateLayers` and to `SettingsPanel` (for `createTrack`).
- Before Create: `await machines.check()`; on failure show an error toast and **do not fall
  back to the director silently** (that would put layers at the wrong playhead).
- After Create on an editor, the track list Refresh still reads the director; the new track or
  layers are already there (§2.2).

## 5. Errors and edge cases

| Case | Behaviour |
|---|---|
| Solo project / no editors | Control hidden, everything on the director |
| Editor left the session | Fallback to the director + toast on the next load / menu open |
| Editor API blocked (IIS on port 80) | Status "unreachable", Create disabled, InfoTip explains |
| Editor has no open track and "At Playhead" | Error from `plan_prepare.py` with the editor's name |
| Editor in Locked mode | Works; tag "Locked" tells the operator the playhead follows the director |
| Network drop in the middle of chunks | As today: partial creation is reported per chunk |
| Two operators create at once | Not handled (same as today with two plugin windows) |

## 6. Docs to update with the feature

- `CLAUDE.md`: the "Key integration point" and "Data Flow" sections (reads on the director,
  writes on the target), the new composable and script in the component breakdown.
- `CHANGELOG.md`: a new minor version entry.
- **Separate fix, found while reading skill 1.3.0:** `CLAUDE.md` says "nothing rolls back on
  timeout", but the skill now says a script that raises or times out **is rolled back**
  (verified r34.0.3 and r34.2.2), and that the timeout does not stop an unbounded loop. The
  chunking rule stays; the wording and the partial-creation message in `createLayerPlan` should
  be re-checked. Proposed as its own `docs:` commit.

## 7. Phases

1. Probes P1 to P5, results in §9.
2. Service + `session_machines.py` + `useSessionMachines`.
3. "Run on" control, status, Create guard, messages with the machine name.
4. Wiring in `MediaSequencer.vue`, check on a live session (director + editor, Independent and
   Locked), narrow window check.
5. Docs (§6), CHANGELOG, version bump.

## 8. Decisions for the owner

- **Q1. Placement:** the first row of the "Where" section (recommended), or a separate small
  button in the panel header / next to Create?
- **Q2. Reads:** keep the media / mapping / track reads on the director (recommended), or send
  everything to the target?
- **Q3. Visibility:** hide the control when there are no editors (recommended), or always show
  it with only "Director"?
- **Q4. Auto-preselect:** if P3 shows the plugin page is served by the editor, preselect that
  editor on first open? Otherwise the default is always the director.
- **Q5. Remember the choice** between sessions (recommended, by hostname), or reset to the
  director each time the panel opens?

## 9. Probe results

(to be filled in phase 1)
