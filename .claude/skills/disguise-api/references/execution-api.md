# Python Execution API & environment

Sources:
- https://developer.disguise.one/python-api/execution-api/
- https://developer.disguise.one/python-api/environment/

## Two endpoints

| Endpoint | Purpose | State |
|---|---|---|
| `POST /api/session/python/execute` | Run a block of Python 2.7 in the session | **No state preserved** between calls |
| `POST /api/session/python/registermodule` | Register a Python module usable from later `execute` calls | Module lives in Designer until restart |

### Intended use: show programming, not runtime control

- The API "has not been optimised for performance-related tasks such as executing on every
  frame or providing telemetry". The docs say the endpoint **MUST NOT be polled**. It is for
  functional changes such as object creation.
- Calling it too frequently or **during a show** is not a supported workflow.
- For playhead position, timing or telemetry use the **Live Update API**.
- For this plugin: one call per user action (load media list, create layers) is fine. Don't
  add `setInterval` loops around `executePython`.

## execute

Request:
```json
{ "moduleName": "optional — omit or \"\" for one-off scripts", "script": "python 2.7 source" }
```

Response:
```json
{
  "status": { "code": 0, "message": "", "details": [] },
  "d3Log": "Hello Disguise Designer!\nPython script took 37.35ms\n",
  "pythonLog": "Hello Disguise Designer!\n",
  "returnValue": "null"
}
```

- `returnValue` is a **JSON string** (`"{\"a\": [], \"b\": 2}"`), serialised with Python's
  `json` package. That's why `executePython` runs `JSON.parse` on it. Without a `return` it
  is the string `"null"`.
- `d3Log`: Designer console output while the script ran, plus the run time. Other threads may
  add unrelated lines.
- `pythonLog`: only this script's `print` output and warnings.
- `status.code != 0` / `status.message`: errors, including exceptions and timeouts.

## registermodule

Request:
```json
{ "moduleName": "screen_utils", "contents": "<full module source>" }
```
Response is only `{ "status": {...} }`. **Compile errors are reported in `status.message`.**

```python
# contents of module "screen_utils"
from d3 import *            # REQUIRED — modules do not get the auto import

def createLEDScreen():
    screen = resourceManager.loadOrCreate('objects/ledscreen/ledscreen_1.apx', LedScreen)
    screen.scale = Vec(1, 2, 0)
    screen.resolution = Vec(1920, 1080)
    screen.offset = Vec(0, 0, 0)
    return screen
```

Use it by passing `moduleName`. The module **is** the execution namespace, so its functions
are in scope without an import:
```json
{ "moduleName": "screen_utils", "script": "createLEDScreen()" }
```

### The d3 import difference (most common NameError)

| | `execute` script | registered module |
|---|---|---|
| `d3` auto-imported (`LedScreen`, `Vec`, `state`, `guisystem`, `resourceManager` …) | ✅ yes, on every call, with or without `moduleName` | ❌ no — must write `from d3 import *` at top |
| `from x import *` allowed | ❌ no (function body) | ✅ yes (module level) |
| `trackTime()`, `runningTime()` | ✅ only **without** `moduleName` | ❌ cannot be imported |

A script that works through `execute` can fail as a module with
`NameError: name 'LedScreen' is not defined`. Add `from d3 import *`. The import is not
inherited from the calling `execute` and not shared between modules.

### Module naming and cross-module use

- Names are non-empty, contain only alphanumerics and `. - _`, and can't start or end with
  `. - _`.
- Registered modules are stored as **`user_module_<name>`**. Import them under that name from
  another module or script:

```python
# execute with moduleName "screen_utils", using a second module "serialise_helpers"
from user_module_serialise_helpers import serialiseLED
return serialiseLED(createLEDScreen())
```

### Loading modules on Designer startup

Put them in `{project_root}/plugins/`:
- a sub-directory with `__init__.py` loads as a plugin named after the directory;
- a `.py` file loads as a plugin named after the file.

### Should this plugin use registermodule?

`createLayers()` sends a large generated script on every click. Possible future optimisation:
register a helper module once at startup, then send short `execute` calls with
`moduleName`. Trade-offs:
- the module disappears on Designer restart, so re-register on load or on `NameError`;
- `trackTime()` isn't available inside module scripts;
- the module must `from d3 import *`.

The current approach (self-contained scripts) is simpler and stateless. Keep it unless
script size or speed becomes a problem.

## Execution context

- Code is indented into a wrapper function (`userScript` / `runner`), so it runs in
  **function scope**:
  - `return` at top level → `returnValue`;
  - no globals can be created; `from pkg import *` is invalid.
- **Error line numbers are offset by 10.** "line 12" in an error = line 2 of your script.
  For JS template-literal scripts that start with a newline (`` `\ndef run(): ``), count
  from that first empty line.
- **Python 2.7.** `print` is a statement (`print("x")` with one arg still works),
  `/` on ints truncates, `dict.keys()` returns lists, strings are bytes by default
  (`u"..."` for unicode), no f-strings.

### Globals in the default namespace

`guisystem`, `state`, `d3` (global application object), `resourceManager`, `Resource`, plus
everything from `d3` (see SKILL.md → Global variables) and the utility functions
`trackTime()` and `runningTime()`.

```python
track = guisystem.track
video_layers = [l for l in track.layers if l.moduleType() == VariableVideoModule]
stage = state.stage
devices = state.devices
```

## Restrictions

| Removed | Why / alternative |
|---|---|
| `threading` module | Would interfere with the render loop. Run threaded work as a remote plugin calling the APIs |
| `sys` module | Unsafe environment changes. Use REST APIs from an external script |
| Designer Widgets (internal UI) | Build UI in HTML/JS (as this plugin does) |
| Designer Actions (subscriptions) | Plugin Python isn't persistent, so no event listeners or callbacks |
| Screenshots | Not available from Python |

## Run time and timeouts

- Scripts run on the **main application thread**. Designer pauses while the script runs.
- If a script exceeds the experimental `pythonApiExecutionTimeout` option (d3Manager), Designer
  raises a `KeyboardInterrupt` and the response contains a `TimeoutError`.
- Best practice: keep scripts short. Split heavy work into several sequential `execute` calls
  instead of one long loop. For example, create layers in chunks when the user selects
  hundreds of clips.

## Debugging aids

- Use `print(...)` and read `pythonLog`. Remember the 10-line offset.
- Wrap risky parts in `try/except` and return a structured error:
  ```python
  try:
      layer = next(l for l in track.layers if l.name == "My Layer")
  except StopIteration:
      return {"status": "error", "message": "Layer not found"}
  except Exception as e:
      return {"status": "error", "message": str(e)}
  ```
- The experimental d3Manager flag **`pythonApiOutputRequestsToProject = True`** writes every
  executed script to `<project>/internal/PythonApiHistory/`. It's useful for checking exactly
  what JS generated. Turn it off afterwards because the project grows fast.

## Undo

Undo **is supported** for `execute` scripts. Call `markDirty(resource)` before each
change so the change is recorded (see SKILL.md → Resources).
