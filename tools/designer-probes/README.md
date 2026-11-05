# Designer probes

Scripts that run Python against a live Disguise Designer session through
`/api/session/python/execute`. They verify what the Python API really returns before the plugin
depends on it. Findings are recorded in `docs/PLAN-ui-redesign.md` §12 and in the
`disguise-api` skill.

```bash
node tools/designer-probes/run.mjs                      # all read-only probes in probes/
node tools/designer-probes/run.mjs src/services/python/media_details     # one probe
node tools/designer-probes/run.mjs path/to/script       # any .py file (path without .py)
node tools/designer-probes/run.mjs --director host:port # default localhost:80
```

Each response (status, `d3Log`, `pythonLog`, parsed result) is saved to `results/<name>.json`.

| Folder | What | Safe? |
|---|---|---|
| `probes/` | Read-only queries (project overview, mapping types/fields, clip fields, alpha/audio, media details) | Yes |
| `tests/` | **Write** tests. They only touch the scratch track `objects/track/zz_probe_test.apx`. Run `t10_setup_track` first and `t99_cleanup` at the end. `*_template.py` files contain `__N__`; substitute it before running | Modifies the project (scratch track only) |
| `tests/adhoc/` | One-off experiments behind specific findings: timeout (`x_sleep_*`), track length (`x_extend`, `x_tail`), clearing mappings (`x_nomap`), source-file path (`x_frag`), `IOError` from `open()` (`x_readfile`, written when it looked uncatchable) | Mixed; read before running |
| `results/` | Raw responses from the runs on the `api_test` project (2026-10-08) | - |
| `../../src/services/python/` | The Python the plugin itself sends (`media_details.py`, `mapping_list.py`), imported by `disguiseService.js` with `?raw`. Run them by path to test changes against Designer before reloading the UI | Yes (read-only) |

`verify_media.mjs` cross-checks `results/media_details.json` against the media files on disk:

```bash
node tools/designer-probes/run.mjs src/services/python/media_details
node tools/designer-probes/verify_media.mjs "D:/d3 projects/api_test" [pathFilter]
```

Gotchas when writing probes (see the `disguise-api` skill):
- Python 2.7.
- The timeout is ~1 s. A script that raises or times out is rolled back, but the timeout does
  not stop an unbounded loop: bound every loop.
- `except Exception` catches nothing (`Exception` is `d3.Exception`): use
  `except __builtin__.Exception:` or a concrete class.
- Never touch attributes holding `Action` objects.
- Check `os.path.exists` before calling `open()`.
- `os` is Designer's `OS` object, not Python's module: `import os.path` before `os.path.exists`.
