# Projectors and calibration

Source: https://developer.disguise.one/python-api/guides/calibration/

## Creating a projector

```python
projector = resourceManager.loadOrCreate('objects/projector/myprojector.apx', Projector)
projector.resolution = Vec2(3840, 2160)   # 4K
```

Projectors on stage: `state.stage.projectors` (list; `stage` is not a global). Look up by display name with
`next((p for p in stage.projectors if p.description == name), None)`.

## Three calibration approaches

| System | Kind | Python entry point |
|---|---|---|
| **OmniCal** | Fully automated, camera-based | `Resource.opticalCalibrator` (`OpticalCalibrator`), plan = `OptiCalStagePlan` |
| **QuickCal** | Semi-automated: align known 3D points to 2D projector pixels | `Resource.ManualAlignmentPlan` — core workflow is in the Designer UI |
| **Manual** | Edit intrinsics/extrinsics directly; can be combined with feed warping | `projector.calibration` (`ProjectorConfig`) |

## OmniCal

Workflow: get `opticalCalibrator` → configure `OptiCalStagePlan` (cameras + projectors) →
`requestCalibrate()` returns an `OptiCalTask` to monitor → read `report` / `result`.

```python
omnical  = Resource.opticalCalibrator
plan     = omnical.plan                     # OptiCalStagePlan
settings = plan.calibrationSettings
task     = omnical.requestCapture()         # automated capture
task     = omnical.requestCalibrate()       # full calibration
task.running()                              # bool
task.progress()                             # 0.0 – 1.0
task.success()                              # bool
report   = omnical.report
result   = omnical.result
```

Calibration takes a long time, so **never wait for it inside one execute call**: it runs on the
main thread and would hit the timeout. Start the task in one call. The execute endpoint
**must not be polled** (see `references/execution-api.md`), so don't loop on
`running()`/`progress()` from JS. Check the result on an explicit user action (a "Check
status" button), or use the Live Update API for progress.

## QuickCal

Workflow (mostly UI): select projector + 3D reference points → adjust each point's 2D pixel
coordinates → apply alignment to the projector.

```python
manual_plan          = Resource.ManualAlignmentPlan
alignment_data       = manual_plan.alignmentData
quick_align_settings = manual_plan.alignmentSettings
alignment_data.addAlignmentCoordinate(aptc, coord, cam)
# stub: addAlignmentCoordinate(aptc: AlignmentPointToCoordinates, coord: Vec2, cam: str)
```

## Manual calibration

Changes apply immediately when the properties are set.

```python
proj = state.stage.projectors[0]
cfg = proj.calibration                 # ProjectorConfig
markDirty(cfg)                         # resource guideline: mark before changing
cfg.lensShift  = [0.1, -0.05]          # [horizontal, vertical]
cfg.throwRatio = 1.5
cfg.position   = [1.0, 2.5, -3.0]      # [x, y, z]
cfg.rotation   = [0, 45, 0]            # [yaw, pitch, roll]
```

Reference pages: `OpticalCalibrator`, `Projector`, `ProjectorConfig`.
