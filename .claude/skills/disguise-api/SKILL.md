---
name: disguise-api
description: >
  How to work with the Disguise Designer Python REST API in this project. Use this skill
  whenever the user asks about calling Disguise APIs, adding new API calls, modifying
  disguiseService.js, writing Python scripts for the /api/session/python/execute endpoint,
  working with VideoClip / Projection / Track / Layer / Projector / Device resources, handling
  HH:MM:SS:FF time formats, creating timeline layers, reading or setting layer sequences and
  keyframes, tags/cues/sections, transport control (play, jump to cue/time/beat, speed),
  OSC/DMX/MIDI devices, expression variables, projector calibration (OmniCal / QuickCal /
  manual), stage objects / surfaces / DMX screens and lights, feeds and output warping,
  expressions, live video inputs, d3net machines and director/understudy roles, audio and
  volume, the d3.pyi type stubs, or any interaction with the Disguise Designer runtime. Also use
  when adding new features that need to query or mutate the Disguise session state.
---

# Disguise API Skill

This project drives Disguise Designer entirely through a single REST endpoint that executes
arbitrary Python. There is no static backend — every feature is a Python string built in JS
and POSTed to Designer.

Official docs: https://developer.disguise.one/python-api/docs/ (type stubs: `/assets/d3.pyi`).

## Reference files (read when the task touches the topic)

| File | When to read |
|---|---|
| `references/transports.md` | Playback control: play/stop, jump to time/beat/cue/MIDI note, speed, brightness, volume, timecode status, OSC/MIDI event transports |
| `references/devices.md` | Device Manager, OSC / DMX devices, enabling/creating/deleting devices, ExpressionVariablesDevice |
| `references/calibration.md` | Projectors, OmniCal (`OpticalCalibrator`), QuickCal (`ManualAlignmentPlan`), manual lens/position calibration |
| `references/execution-api.md` | Endpoint semantics: execute vs registermodule, d3-import differences, module naming, timeouts, removed modules, debugging and undo |
| `references/useful-strings.md` | Official ready-made snippets: projector creation, OSC setup, expression variables, LED-screen grid with keyframes, feed-rect dump |
| `references/expressions.md` | Expression syntax (`self`, `time`, `osc:`, `dmx:`, `module:`, `if()`, `format()`), `fseq.setExpression(...)`, ExpressionVariable devices |
| `references/stage.md` | `state.stage`, Object transforms (offset/rotation/scale), surfaces, venue/props, pucks, DMX screens and DMX lights |
| `references/feed.md` | FeedScene / FeedRect / FeedHeadConfig, FeedProjection, VFC outputs, DeformStack warping |
| `references/video-input.md` | Live-input VideoClips (`isVideoIn`), formats, crop, VideoInSystem |
| `references/d3net.md` | Machines, director / understudy / actor roles, dispatching remote commands |
| `references/audio.md` | AudioTrack / AudioFile / AudioAnalyser, layer and master volume, output mapping |
| `references/d3.pyi` | **Authoritative type stubs** (r34.1, ~58k lines). Never read whole — `Grep` for `^class Name\b` or `def member\(` to confirm a class, property or signature exists |

### Docs vs stubs

The official guides contain mistakes. Several examples don't match d3.pyi: non-existent
`system` / `project` globals, f-strings (invalid in Python 2.7), `track.moveLayer`. When a
guide snippet and `d3.pyi` disagree, **trust d3.pyi**. Grep it before using any member you
haven't seen working in this codebase.

---

## The execution model

```
Frontend (Vue) → builds Python string → POST /api/session/python/execute → Designer runtime
                                                                          ↓
                                                              returns { returnValue: ... }
```

The `executePython` helper in `src/services/disguiseService.js` handles the HTTP round-trip.
All new API calls should go through it — don't re-implement the fetch logic.

```js
// src/services/disguiseService.js
async function executePython(directorIp, script) {
  const endpoint = `http://${directorIp}/api/session/python/execute`;
  const response = await fetch(endpoint, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ script })
  });
  const data = await response.json();
  let result = data.returnValue;
  if (typeof result === 'string') {
    try { result = JSON.parse(result); } catch (e) {}
  }
  return result;
}
```

The `directorIp` is injected via `?director=` URL param, parsed in `App.vue` and passed
down to the main plugin component and then into every service call:

```js
// App.vue
const urlParams = new URLSearchParams(window.location.search);
const directorEndpoint = urlParams.get('director') || 'localhost:80'; // fallback for dev
```

During local development (`npm run dev`) the fallback `localhost:80` is used automatically,
so the plugin can be tested against a locally-running Designer instance without any URL params.

### Request / response format

Request body:
```json
{ "moduleName": "", "script": "<python 2.7 source>" }
```
`moduleName` is optional — omit it (as this project does) for one-off scripts. A registered
module (`/api/session/python/registermodule`, body `{ moduleName, contents }`) does **not**
get the auto `d3` import or the execution utility functions.

Response body:
```json
{
  "status":   { "code": 0, "message": "...", "details": [ { "type_url": "...", "value": "..." } ] },
  "d3Log":    "Designer console output during execution (may include other threads' output)",
  "pythonLog":"only print() / warning output from your script",
  "returnValue": "JSON-serialised return value"
}
```
`executePython` only returns `returnValue`. When debugging, temporarily log `data.status`
and `data.pythonLog` — Python exceptions and `print()` output show up there.

### Runtime rules (important)

- **Python 2.7.** No f-strings, no `print x` vs `print(x)` surprises — use `"{}".format(...)`
  or `%` formatting. Integer division `/` truncates on ints — use `float()` or `/ 2.0`.
- **The script is wrapped in a function** (`runner` / `userScript`). Consequences:
  - A top-level `return` works and becomes `returnValue`.
  - You **cannot create globals**, and `from x import *` is invalid. Use `import json`, `import math`.
  - **Error line numbers are offset by 10**: "line 12" in an error = line 2 of your script.
- The whole `d3` package is auto-imported — every type (`Track`, `VideoClip`, `Vec2`, ...) is
  already in scope. Registered modules **don't** get this, so they need `from d3 import *`.
- Return values are serialised with Python's `json` — return dicts/lists of primitives. Convert
  `Path`, `uid`, vectors etc. with `str(...)` before returning.
- **Scripts run on Designer's main thread.** Long loops freeze the UI; if a script exceeds the
  `pythonApiExecutionTimeout` option (d3Manager), a `KeyboardInterrupt` is raised and the
  response returns a `TimeoutError`. Keep scripts short; split big jobs into several calls.
  **Measured (default settings):**
  - the timeout is **≈1 s of Python time**: `sleep(0.9)` passes, `sleep(1.0)` fails;
  - **nothing rolls back on timeout**: everything done before the interrupt stays;
  - after the script, Designer closes the undo operation on the main thread, and that cost
    grows with track size (~560 ms for a 100-layer chunk on a 900-layer track);
  - creating one fully configured layer takes ~0.8 ms;
  - **create layers in chunks of ≤100 per call.**
- **Methods vs properties:** in `references/d3.pyi`, only members marked `@property` are
  attributes. Everything else is a method: `track.nLayers()`, `track.nSections()`. Using a
  method as an attribute returns a bound method, which then fails JSON serialisation.
- **The endpoint MUST NOT be polled** and isn't meant to be called during a live show. It is for
  show programming (creating and changing objects). For playhead or telemetry, use the
  **Live Update API**. Never wrap `executePython` in `setInterval`.
- **Removed:** the `threading` and `sys` modules, Designer widgets, action subscriptions (no
  persistent listeners), and screenshots.
- **Undo is supported**, provided you call `markDirty()` before each change.
- **`Action` objects are forbidden** (verified on a live session). Reading an attribute that
  holds an `Action` (e.g. `onChangedAction`) raises
  `TypeError: Access to object of type 'Action' is not allowed`. **`try/except` does not
  catch it**, so the whole script fails. Never `getattr` every name from `dir(obj)`: skip
  names containing `Action`.
- `return resource` serialises to `{"path", "_type", "uid"}`. `_type` is the class name.
- Debugging: set the d3Manager experimental flag `pythonApiOutputRequestsToProject = True` to
  dump every executed script to `<project>/internal/PythonApiHistory/`.

Full details (registermodule, `user_module_` prefix, startup `plugins/` folder, d3-import
differences) → `references/execution-api.md`.

---

## Python script patterns

### Simple one-liner
```python
return resourceManager.allResources(VideoClip)
```

### Multi-step wrapped in a function (project convention)
```python
def run():
    track = resourceManager.load("objects/track/mytrack.apx", Track)
    if not track:
        return {"status": "error", "message": "Track not found"}
    return {"status": "success", "uid": str(track.uid)}

return run()
```

Always wrap multi-step logic in `def run(): … return run()`. The outer `return` is what
Designer captures as `returnValue`. Forgetting it means the endpoint returns `null`.

### Returning data to JS
Return a plain Python dict or list — Designer serialises it to JSON automatically.
If you need to return a string that is itself JSON (`json.dumps(...)`), the `executePython`
helper will `JSON.parse` it on the JS side.

---

## Global variables and functions

Designer has two core systems: the **Resource system** (objects saved in the project, persistent)
and the **State system** (transient runtime state — only valid at the moment you read it).

### Global variables

| Global | Type | What it is |
|---|---|---|
| `resourceManager` | `ResourceManager` | Load, create, remove, enumerate resources |
| `guisystem` | `GuiSystem` | Current UI state (selected track, player, transport manager) |
| `state` | `D3State` | Current project state — stage, devices, project, refresh rate |
| `subsystems` | `SubsystemManager` | Access to Designer subsystems |
| `d3NetManager` | `D3NetManager` | Session / network (director, actors, understudies) |
| `alertNotificationSystem` | `AlertNotificationSystem` | Designer alerts/notifications |
| `paths` | `PathsManager` | Project / filesystem paths |
| `os`, `d3os` | `OS` | Designer OS helper object (not Python's `os` module) |
| `Vec3` | `= Vec` | Alias of the 3D vector class |
| `Resource` | class | Base class of most project objects (`Resource.opticalCalibrator`, ...) |

Commonly used members:

| Expression | Meaning |
|---|---|
| `guisystem.track` | Track currently selected in the UI |
| `guisystem.player.tCurrent` | Current playhead position in **beats** (used by this project) |
| `guisystem.currentTransportManager` | Active `TransportManager` (see `references/transports.md`) |
| `state.globalRefreshRate` | Project refresh rate (use `.asDouble`) |
| `state.devices` | Device Manager singleton (see `references/devices.md`) |
| `state.stage` | The `Stage` — `state.stage.projectors`, `.surfaces`, ... (see `references/stage.md`). `stage` is **not** a global |
| `state.feed` | Current `FeedScene` (see `references/feed.md`) |
| `subsystems.getSystem(VideoInSystem)` | Get a subsystem instance (`maybeGetSystem` returns None if absent) |

Not globals despite appearing in some guides: `system`, `project`, `stage`.

### Execution utility functions (only in `execute` without `moduleName`)

| Function | Meaning |
|---|---|
| `trackTime() -> float` | Current track time of the current transport (`LocalState.localState().currentTransport.player.tCurrent`). Documented as **seconds**; the official "add layer at playhead" snippet passes it straight to `addNewLayer`, while the track guide converts it with `track.timeToBeat(trackTime())`. Prefer the explicit conversion. |
| `runningTime() -> float` | Like `trackTime()` but for the GUI transport and also counts time held at the end of a section ("normal mode" playback). `...player.tRunning` |

### Global functions

| Function | Meaning |
|---|---|
| `markDirty(resource)` | Mark a resource as **about to** change (undo/redo + persistence). Call **before** mutating |
| `clamp(v, lo, hi)` | Clamp a float |
| `rp(resource)` | Make Python own the resource object |
| `makeReference(value)` | Make a reference to the passed object |
| `makeMemberNameValid(name)` / `originalMemberName(name)` | Map C++ `FieldInfo` names ↔ valid Python identifiers |
| `isCppType(type)`, `getCppTypeString(type)`, `getCppRawAddress(value)` | Introspection of C++-backed types |
| `tr(s)`, `TFormat(pattern, *args)`, `TFormatContext(ctx, pattern, *args)` | Localisation helpers |

### Utility types

| Constructor | Use |
|---|---|
| `Vec2(x, y)` | 2D float vector (e.g. projector resolution `Vec2(3840, 2160)`) |
| `Vec(x, y, z)` / `Vec3(...)` | 3D float vector — position, scale, offset |
| `float4(x, y, z, w)` | 4D float vector |
| `Int2(w, h)` | 2D int vector — resolutions |
| `Path("objects/type/name.apx")` | Resource path object |
| `tc.t` | A `Timecode`'s time in seconds |
| `ReflectionValue` | "Any" type |

`FieldInfo` of a property: `getattr(ClassName.property.fget, 'field', None)` (None → not reflectable).

---

## Resources

Any class deriving from `Resource` (`VideoClip`, `Projection`, `Track`, `Projector`,
`LedScreen`, `Screen2`, `OscDevice`, `FeedScene`, ...) follows these rules.

### Path structure

```
<prefix>/<type>/[subfolder/]<name>.apx
```

- **prefix**: `objects/` = user-visible/selectable; `internal/` = hidden; `internal/thumbnails/`.
- **type**: the internal class name **lowercased** — never the user-facing `__username__`
  (`Screen2` is shown as "Surface" but its path is `objects/screen2/...`).
  Get it safely: `type(obj).__name__.lower()`.
- **name**: filename-safe, **lowercase**. Disk-based files keep their extension and get `.apx`
  appended: `objects/videoclip/folder/clip.mp4.apx`.
- **subfolders**: only for disk-loaded media or auto-created resources that might collide.
- Forward slashes only. Use `r'...'` raw strings in Python when interpolating paths from JS.

> Capitalisation gotcha: path elements must be lowercase — a capitalised path will not match.
> (Some official snippets use `objects/OscDevice/...`; prefer lowercase for new code.)

### Resource management

```python
# Load an existing resource (returns None if not found)
clip = resourceManager.load("objects/videoclip/folder/clip.mp4.apx", VideoClip)

# Load or create — WARNING: a typo silently creates a new resource instead of failing
track = resourceManager.loadOrCreate("objects/track/mytrack.apx", Track)

# All loaded resources of a type
all_clips = resourceManager.allResources(VideoClip)

# Delete — DESTRUCTIVE: removes from project AND deletes the file
resourceManager.remove(obj.path)

# Duplicate to a new path
new_obj = obj.duplicate(obj.path.replaceFilename("new_name"))

# Save to disk immediately / defer to next batched save
obj.save()
obj.saveOnDelete()
```

### Properties

| Task | Code |
|---|---|
| Display name (use this to match user input / show in UI) | `obj.description` |
| User-visible type name | `type(obj).__username__` |
| Unique path (`Path` object) | `obj.path` → `str(obj.path)` before returning to JS |
| Filename | `obj.path.filename` (may differ from `description`) |
| Find by name | `obj.description.lower() == search.lower()` |
| Unique id | `obj.uid` → `str(obj.uid)` |

**Exception:** `Layer` uses `name`, not `description`.

### Unnamed resources, markDirty and saving

- A resource with `path == ""` is **unnamed** (layers, field sequences, cues, module configs).
  Its lifecycle belongs to the nearest **named** ancestor — you must track that parent yourself;
  there is no reliable parent pointer.
- Call `markDirty(x)` **before** changing `x`, on individual resources only — never on lists
  or containers.
- Persist via the nearest named parent: `namedParent.saveOnDelete()`.

```python
# Simple property change on a sub-resource
sub = parent.find_subresource()
markDirty(sub)
sub.property = new_value
parent.saveOnDelete()

# Changing a container held by the parent
markDirty(sub)
markDirty(parent)               # parent's container is changing
parent.container.remove(sub)
parent.saveOnDelete()
```

### Resource types used in this project

| Python type | What it represents |
|---|---|
| `VideoClip` | A media file (video or still image) |
| `Projection` | A mapping/projection surface (`DirectProjection` is one subtype) |
| `Track` | A timeline track |
| `VariableVideoModule` | The layer module type used to create video layers |
| `Tag` | A timeline tag (cue, timecode, MIDI) |

**VideoClip metadata** (verified on a live session, see `tools/designer-probes/`):

| Need | Field | Notes |
|---|---|---|
| Frame size | `clip.fileFrameSize` (`Vec2`) | Use this, **not** `clip.file.resolution`, which is a 64×48 placeholder for live inputs |
| Frames / fps | `clip.fileNFrames`, `clip.fileFps` | Duration (s) = `fileNFrames / fileFps` |
| Duration string | `clip.transportDuration` | e.g. `"00:00:15.01"`. **The last part is FRAMES, not decimal seconds** (451 f @ 30 fps). Do maths with `fileNFrames / fileFps` |
| Live input | `clip.isVideoIn` | Live clips have `fileFps == 0` and `nFrames == 1` |
| Still image | `clip.fileNFrames == 1` and `clip.file.codec.startswith("still_image:")` | |
| Audio | `clip.hasAudio` (== `clip.file.hasAudio`) | **Verified** against file headers. `clip.audioTracks` is empty even for a clip with embedded audio, so the channel count is not available |
| Alpha (videos) | `clip.file.hasAlpha` | **Verified correct** for videos (HAP → False, NotchLC with alpha → True) |
| Alpha (stills) | Read the source file header | `hasAlpha` is a writable asset setting and is **wrong for stills** (JPEG and RGB PNG report True). Rules: JPEG → no; PNG colour type 4/6 or `tRNS` → yes; EXR channel `A` → yes; `.d` → unknown. Reference: `tools/designer-probes/probes/09_alpha_resolved.py` |
| Source file on disk | `clip.file.fragments[0].proxies[0].path` | A `VideoFile`, path relative to the project folder (e.g. `objects/videofile/test 2/x.png`). `open()` and `os.path.exists()` resolve relative to the project folder. **An `IOError` from `open()` is not catchable**, so check `os.path.exists()` first |
| Bit depth | `clip.file.bitDepth` | Enum index: 8 = "8 Bits", 9 = "10 Bits", 11 = "12 Bits", 13 = "16 Bits", 15 = "32 Bits" (0 = unknown) |
| ⚠ Not audio | `clip.file.audioSampleRate` | 44100 even on silent videos. Use `hasAudio` |
| Codec | `clip.file.codec` | e.g. `hap`, `NotchLC`, `rle`, `jpeg` (= **Motion-JPEG video**, not a still), `still_image:PNG`, `still_image:JPEG`, `still_image:EXR`. Detect stills by the `still_image:` prefix |
| Reference implementation | `src/services/python/media_details.py` | All per-clip fields the UI needs. Verified against the files on disk with `tools/designer-probes/verify_media.mjs` (99/99 match) |

`Projection` (all mapping types) has `resolution` (`Vec2`), `proxyCanvasResolution`,
`screens`, and `descriptionExtended` (e.g. `"256x256 - 1 screens - direct"`).
`__username__` of `DirectProjection` is `"Direct"`. Designer auto-creates `internal/`
DirectProjections (GUI display, video-in textures); the plugin filters these out with the
`objects/` prefix.

Other types seen in the docs: `Projector`, `LedScreen`, `Screen2` ("Surface"), `OscDevice`,
`DmxDevice`, `ExpressionVariablesDevice`, `FeedScene`, `BlurModule`, `VideoModule`, `OpenModule`.

---

## Time format: HH:MM:SS:FF

Designer timelines use **beats** internally. Time ↔ beats is *not* a fixed ratio across a track
(BPM can change), so always convert through the track:

```python
beats   = track.timeToBeat(seconds)
seconds = track.beatToTime(beats)
```

When the user supplies a time in `HH:MM:SS:FF` format, convert in JS before embedding:

```js
const [hours, minutes, seconds, frames] = options.startTime.split(':').map(Number);
// FPS from the project refresh rate (halved if > 30 for interlaced)
const fps = refreshRate > 30 ? refreshRate / 2 : refreshRate;
const totalSeconds = hours * 3600 + minutes * 60 + seconds + frames / fps;
```

Then embed `totalSeconds` in the Python script and call `track.timeToBeat(totalSeconds)`.

### Beat-relative duration
To express "N seconds of wall-clock time" as a beat duration at a specific position:
```python
end_time_seconds = track.beatToTime(start_beats) + duration_seconds
duration_beats = track.timeToBeat(end_time_seconds) - start_beats
```
This correctly handles BPM changes on the track.

---

## Tracks

| Task | Code |
|---|---|
| Track selected in GUI | `guisystem.track` |
| Playhead (beats) | `guisystem.player.tCurrent` |
| Track length (beats / s) | `track.lengthInBeats` (settable), `track.lengthInSec` |
| BPM | `track.bpm` (settable), `track.bpmAt(beat)` |
| All layers / count | `track.layers` / `track.nLayers()` |
| Layer index in stack | `track.findLayerIndex(layer)` |
| Tags at a beat | `track.tagsAtBeat(beat)` → `[Tag]`, `track.tagAtBeat(beat, type)` |
| Walk all tags | `track.findBeatOfNextTag(b)`. Returns `1.79e308` after the last tag. **`track.tags` is NOT timeline tags**: it is `Resource.tags` (resource labels) |
| Remove tags | `track.removeTagAtBeat(beat, type)`, `track.removeTags(fromBeat, nBeats)` |
| Sections | `track.nSections()`, `track.sectionToBeat(i)`, `track.sectionAtBeat(beat)` (True on a section start). Compute lengths from consecutive `sectionToBeat`. **`sectionLengthBeats(i)` returned wrong values in tests** |
| All cues (unnamed resources) | `track.cues` — prefer the track's section/tag/note methods |
| Split a section | `track.splitSectionAtBeat(beat)`. Splitting twice at the same beat is a no-op |

> ⚠ **The track does not grow by itself** (verified). A layer that crosses `lengthInBeats` is
> truncated. A layer that starts past the end gets a zero or negative length and becomes
> invisible, while its tags and splits are still placed. Extend the track **before** creating:
> `markDirty(track); track.lengthInBeats = max(track.lengthInBeats, planned_end_beats)`.
> `layer.setExtents(start, end)` repairs a truncated layer.

---

## Layers

A `Layer` is an unnamed resource owned by its track. Name via `layer.name` (not `description`).

| Task | Code |
|---|---|
| Create | `track.addNewLayer(ModuleType, start_beats, length_beats, "Name")`. **The new layer always goes to index 0 (top of the stack)**, whatever its start time. Creating A, B, C gives C, B, A |
| Iterate / count | `for layer in track.layers:` / `len(track.layers)` |
| Find by name | `next((l for l in track.layers if l.name == "My Layer"), None)` |
| Module type | `layer.moduleType()` |
| Remove | `track.removeLayer(layer)` |
| Reorder in stack | `track.moveLayerToIndex(layer, new_index)` (guide says `moveLayer` — doesn't exist in d3.pyi); also `moveLayersUp/Down([layers])` |
| Rename | `layer.name = "New Name"` |
| Start / end / length (track beats) | `layer.tStart`, `layer.tEnd`, `layer.tLength` (`= tEnd - tStart`). `tStart` and `tLength` are settable; or use `layer.setExtents(start, end)` |
| Enable / disable | `layer.enabled = True / False` |
| Arrow (src → dst) | `track.makeArrow(src_layer, dst_layer)` |
| Module config | `layer.moduleConfig` (only for generic modules, e.g. `OpenModule` → `OpenModuleConfig`) |

### Creating a video layer

```python
new_layer = current_track.addNewLayer(
    VariableVideoModule,   # module type
    start_beats,           # where on the track (in beats)
    length_beats,          # how long (in beats)
    "Layer Name"           # display name
)
```

Timed layer at the playhead (official pattern):
```python
current_time = trackTime()   # seconds
duration_beats = track.timeToBeat(current_time + 30) - track.timeToBeat(current_time)
video_layer = track.addNewLayer(VideoModule, track.timeToBeat(current_time), duration_beats, "Video")
```

Effect layer matching the extents of existing layers:
```python
target_layers = [l for l in track.layers if l.name.startswith("Video")]
start = min(l.tStart for l in target_layers)
end = max(l.tEnd for l in target_layers)
blur_layer = track.addNewLayer(BlurModule, start, end - start, "Blur Effect")
```

### Composition rules

- Layers overlapping in time and targeting the same screens blend via their blend modes.
- Stack order = order in the parent's (`track` / container) layer list. **Earlier = higher**;
  a layer's blend mode affects the layers below it.
- Vertical position on the timeline is unrelated to list order. Use `track.moveLayerToIndex`.
- Related content should overlap in `tStart`/`tEnd`; avoid unnecessary gaps (they cause
  unintended pauses) and avoid full-track layers.

### Modules

Do **not** touch the Module object directly (may be absent or change). Always go through
`FieldSequence`s (and `layer.moduleConfig` where applicable).

---

## FieldSequence and KeySequence (layer properties / keyframes)

Field sequences are **the only way** to set values on layers. Each holds a `KeySequence`
(keyframes) with at least one key. **Keyframe times are track beats, not layer-relative.**

```python
# Generic sequence-setting pattern (used throughout disguiseService.js)
fseq = new_layer.findSequence("sequence_name")
if fseq:
    markDirty(fseq)
    fseq.disableSequencing = True              # static value (no animation)
    fseq.sequence.setResource(beat, resource)  # resource properties
    fseq.sequence.setFloat(beat, value)        # numeric properties
    fseq.saveOnDelete()
```

### FieldSequence

| Task | Code |
|---|---|
| Find by name | `layer.findSequence("brightness")`. **Case-insensitive** (verified) |
| All sequences | **`layer.fields`** (verified). `layer.sequences` does NOT exist despite the official guide. Also `layer.nSequences()` / `layer.sequence(i)` |
| Sequence types | `type(fseq.sequence).__name__`: `FloatSequence` (keys `KeyFloat`, `.v`), `ResourceSequence` (keys `KeyResource`, `.r`; no `.v`) |
| Sequence name | `fseq.name` |
| Animate (multiple keys) | `fseq.disableSequencing = False` — only if the value really changes over time |
| Is sequenced? | `not fseq.disableSequencing` |
| Evaluate at a beat | `fseq.eval(track_beat, ttl)` — stub signature is `eval(t: float, ttl: int) -> float` (the guide calls the 2nd arg a "default value") |
| Expression | `fseq.setExpression("self * 0.5")` — see `references/expressions.md` |

### KeySequence (`keyseq = fseq.sequence`)

| Task | Code |
|---|---|
| Key count | `keyseq.nKeys()` |
| Key time by index | `keyseq.t(i)` |
| All key times | `[keyseq.t(i) for i in range(keyseq.nKeys())]` |
| Key object | `keyseq.key(i)` |
| Insert key | `keyseq.insert(i, time_beats, key_type)` |
| Insert key container | `keyseq.insertKeyContainer(time_beats, i, key_container)` |
| Remove key | `keyseq.remove(i, 1)` |
| Clear all but first | `keyseq.stripToFirstKey()` |

| Value type | By index | By time (track beats) |
|---|---|---|
| Float | `keyseq.key(i).v = value` | `keyseq.setFloat(beat, value)` |
| String | `keyseq.setString(i, value)` | `keyseq.setStringAtT(beat, value)` |
| Resource | `keyseq.key(i).r = resource` | `keyseq.setResource(beat, resource)` |

Resource sequences can also be set via a path string: `layer.fields[10].sequence.setString(0, 'objects/videoclip/sample/george.jpg.apx')`.

Constant value example:
```python
fseq = my_layer.findSequence("brightness")
markDirty(fseq)
fseq.disableSequencing = True
fseq.sequence.setFloat(my_layer.tStart, 25.0)   # time = layer start, in track beats
```

### Key sequence names for VariableVideoModule (as used in this project)

| Sequence name | Type | Value |
|---|---|---|
| `"video"` | resource | `VideoClip` instance |
| `"mapping"` | resource | `Projection` instance |
| `"mode"` | float | `0` = Locked, `1` = Normal |
| `"At end point"` | float | `0` = Loop, `1` = Ping-Pong, `2` = Pause |
| `"Brightness"` | float | `0.0`–`1.0` |

Set `disableSequencing = False` and use multiple `setFloat` calls at different beats to
animate a property (e.g. brightness fade-in). If unsure of a sequence's exact name, list them:
`[s.name for s in layer.fields]`.

Real field names of `VariableVideoModule` (54, all lower-case; verified):
- `blendMode`, `brightness`, `mapping`, `palette`, `xCol`, `yCol`;
- `tint.r/g/b/a`;
- `video`, `speed`, `mode`, `at end point`, `transition time`, `volume`, `output`;
- `brightness (shift)`, `contrast (scale)`, `gain`, `saturation scale`, `hue shift`;
- `RGB controlled`, `red/green/blue min/max/gamma`;
- `threshold`, `hardness`, `key colour.r/g/b`;
- `size`, `scale.x/y`, `pos.x/y`, `rotation`;
- `left`, `right`, `top`, `bottom`, `cropSoftness`;
- `acesExposure`, `acesGamma`, `cdl`, `ocioExposure`, `ocioContrast`, `ocioGamma`.

There is **no `opacity`**.

**Defaults on a fresh layer** (verified):
- `mode` = 1 (Normal), `at end point` = 0 (Loop), `brightness` = 1, `video` = None;
- **`mapping` is pre-filled by Designer** with an existing mapping (in tests it was the
  Fisheye one);
- to really leave a layer without a mapping, clear it:
  `fs.sequence.setResource(beat, None)`.

---

## Tags

Tags are markers at specific beats for navigation, external triggering, or event marking.

```python
tag = Tag(tag_type, tag_text)
current_track.setTagAtBeat(beat_position, tag)
```

| `tag_type` | Meaning | Text format |
|---|---|---|
| `0` | Timecode tag (`TC`) | `"HH:MM:SS:FF"` zero-padded, e.g. `"01:00:00:00"`; frames must match track frame rate |
| `1` | Cue tag (`CUE`) | `X`, `X.Y` or `X.Y.Z`, e.g. `1.2.3` |
| `2` | MIDI note tag (`MIDI`) | `<channel>.<note>`, e.g. `1.60` |

**One tag per type per beat** (verified). TC, cue and MIDI tags can share a beat, but a
second tag of the same type at the same beat **replaces** the first. `Tag.text` and
`Tag.type` read back the raw values.

Notes (text annotations on beats/sections for operators): `track.setNoteAtBeat(beat, text)`,
`track.noteAtBeat(beat)`, `track.removeNoteAtBeat(beat)`.

---

## Splitting sections

```python
current_track.splitSectionAtBeat(beat_position)   # optional 2nd arg: TrackTransitionInfo
```

Call before the first layer to open a section, and after each layer's end beat to close it.
`SPLIT_SECTION` in the existing script demonstrates the pattern.

---

## Building new service functions

Follow the existing pattern in `disguiseService.js`:

```js
export async function myNewFeature(directorIp, param) {
  const script = `
def run():
    # ... Python using param: ${param} ...
    return {"status": "success", "result": some_value}
return run()
`;
  return await executePython(directorIp, script);
}
```

**Escaping pitfalls:**
- Use `r'...'` raw strings in Python when embedding paths interpolated from JS.
- Avoid single quotes inside Python string literals if the JS template uses single quotes —
  use double quotes inside Python or escape carefully. For arbitrary user text, embed
  `JSON.stringify(value)` — a JSON string literal is a valid Python string literal.
- Indentation inside the template literal is significant Python — keep it consistent.
- Variable names in the generated Python must not collide with Designer globals
  (`track`, `clip`, `state`, `paths`, `os`, `subsystems`, etc. — prefix locals with `current_`).
- Python 2.7: no f-strings, use `.format()`.

---

## Media hierarchy

`resourceManager.allResources(VideoClip)` returns flat paths like:
```
objects/videoclip/folder/subfolder/clip.apx
```

`buildFileHierarchy()` in `disguiseService.js` converts this flat list into the nested
folder tree the sidebar renders. When adding new media-related features, parse paths the
same way: strip the `objects/videoclip/` prefix, split on `/`, last segment is the file.

Thumbnail URL pattern (used in the media item component):
```
http://{director}/api/v1/thumbnail/{uid}
```

---

## Checklist when adding a new Disguise API feature

1. Write the Python (2.7) logic first — test the raw script in Designer's Python console if possible.
2. Add a new exported function to `disguiseService.js` that calls `executePython`.
3. Return a structured dict from Python (`{"status": "success", ...}`) so the JS side can
   detect errors reliably; stringify `Path`/`uid`/vector values.
4. `markDirty()` before every mutation; `saveOnDelete()` on the nearest named parent after.
5. Call the service function from your main plugin component; pass `directorIp` as the first arg.
6. If the feature involves time input from the user, convert HH:MM:SS:FF → seconds in JS
   before embedding in the script; convert seconds → beats via `track.timeToBeat`.
7. For destructive ops (`resourceManager.remove`, `deleteDevice`) confirm with the user in the UI.
