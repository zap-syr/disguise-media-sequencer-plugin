# Stage

Source: https://developer.disguise.one/python-api/guides/stage/

`stage` is **not** a global — get it from state: `stage = state.stage`.

## Object class

All 3D stage elements (screens, props, surfaces, lights, projectors) inherit from `Object`:

| Property | Meaning |
|---|---|
| `offset` | 3D position (`Vec`) relative to parent |
| `rotation` | Orientation (`Vec`, degrees; or quaternion depending on context) |
| `scale` | Multiplier of the mesh size |
| `mesh` | Mesh resource; default internal `Rectangle` is 1 m × 1 m, so `scale` = absolute size in metres |
| `resolution` | Pixel resolution for display objects |

```python
my_obj.offset = Vec(1.0, 2.0, 3.0)
my_obj.rotation = Vec(0.0, 90.0, 0.0)
my_obj.scale = Vec(16.0, 9.0, 0.1)        # 16 m × 9 m screen
my_obj.resolution = Int2(1920, 1080)
```

**Hierarchy:** parent/child between Objects only inherits transforms. Adding/removing objects
from the stage is done by adding them to the **correct typed list** on `Stage`.

## Collections

| Collection | Notes |
|---|---|
| `stage.surfaces` | `List[Screen2]` ("Surfaces"). Adding makes the surface visible/active |
| `stage.projectors` | `List[Projector]` |
| `stage.dmxScreens` | `List[DmxScreen]` |
| `stage.dmxLights` | `List[FixtureGroup]` |
| `stage.lights` | lights |
| `stage.displays` | **All** displays (screens + projectors …) — a duplicate view of the typed lists; convenient for reading |
| `stage.pucks` | Pucks (controlled by `stage.people`). Unnamed, `description` is always `"Puck"` → identify by index. In overviews mention only the count |
| `stage.venue` | May be `None`. `stage.venue.props` = all props; some props are "null" transform groups |

```python
stage = state.stage
surface = next((s for s in stage.surfaces if s.description.lower() == "surface 1"), None)
stage.surfaces.append(my_surface_object)

props = stage.venue.props if stage.venue is not None else []
```

Creating a surface the resource way:
```python
s = resourceManager.loadOrCreate("objects/screen2/my_surface.apx", Screen2)
markDirty(stage)
if s not in stage.surfaces:
    stage.surfaces.append(s)
```

## DMX screens (pixel tape, simplest DMX output)

```python
dmx_screen = DmxScreen()
dmx_screen.fixtureType = 0          # guide writes `fixture_type`; stub name is `fixtureType` (RGB=0)
dmx_screen.array = 1
dmx_screen.origin = 0
dmx_screen.universe = 1
dmx_screen.channel = 101
dmx_screen.universe_step = 3
dmx_screen.scale = Vec(5.0, 0.1, 0.1)
dmx_screen.offset = Vec(0.0, 2.0, 0.0)
stage.dmxScreens.append(dmx_screen)
```

## DMX lights (fixture arrays laid across an Object's mesh)

```python
fixture = Fixture()
fixture.nChannels = 3
fixture.size_ = Vec(0.1, 0.1, 0.1)

driver = DmxDriver()                # or GenericLampDriver / MovingHeadLedDriver
driver.mode = 0                     # RGB
fixture.driver = driver

patch = DmxAssigner()
dmx_string = DmxString()
dmx_string.nUnits = 20
dmx_string.universe = 1
dmx_string.channel = 101
dmx_string.step = 3
patch.strings.append(dmx_string)
patch.assign()

fixture_group = FixtureGroup()      # guide writes DmxLight(); stub type of stage.dmxLights is FixtureGroup
fixture_group.fixture = fixture
fixture_group.assignment = patch
stage.dmxLights.append(fixture_group)
```

Multiple universes: create several `DmxString`s (e.g. 33 units each, universe 1 ch 101 and
universe 2 ch 1, step 3) and append all to `patch.strings`. Clear with `patch.strings = []`.

### Driver variants

```python
driver = GenericLampDriver()              # moving light
driver.lamp.red_channel = 1
driver.lamp.green_channel = 2
driver.lamp.blue_channel = 3
driver.pan_tilt.pan_channel = 5
driver.pan_tilt.tilt_channel = 6
driver.pan_tilt.pan_range = 540.0

driver = MovingHeadLedDriver()            # LED moving head
driver.first_pixel_channel = 1

fixture.aimable = 1
fixture.resolution = Vec2(8, 1)           # 8 LED pixels
```

## Projectors

See `references/calibration.md`.
