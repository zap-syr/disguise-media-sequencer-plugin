# Useful Python strings (official snippets)

Source: https://developer.disguise.one/python-api/useful-strings/

Ready-made snippets for the execute endpoint. `{port}` / `{value}` are placeholders to fill
from JS. Adapt to this project's conventions (`def run(): ... return run()`, lowercase paths,
`markDirty` before changes).

## Add a video layer at the current track time

```python
guisystem.track.addNewLayer(VariableVideoModule, trackTime(), 60, 'Video');
```

## Split the track at the current track time

```python
guisystem.track.splitSectionAtBeat(trackTime());
```

Both use the execution-utility shorthand `trackTime()`. It is documented as seconds, while
`addNewLayer` / `splitSectionAtBeat` take beats - for accuracy on tracks with BPM changes use
`guisystem.track.timeToBeat(trackTime())` or `guisystem.player.tCurrent` (beats).

## Add a projector and set it to 4K

```python
projector = resourceManager.loadOrCreate('objects/projector/myprojector.apx', Projector)
projector.resolution = Vec2(3840, 2160)
```

## Add and configure an OSC device

```python
osc = resourceManager.loadOrCreate('objects/OscDevice/PluginMonitor.apx', OscDevice)

osc.sendIPAddress = '127.0.0.1'  # IP where the plugin is running
osc.sendPort = {port}            # Port where our plugin is listening
osc.receivePort = {port} + 1     # Use next port for Designer to listen

device_exists = False
for device in state.devices.devices:
    if device.path == osc.path:
        device_exists = True
        break
if not device_exists:
    state.devices.devices.append(osc)
    print("Added OSC device to state.devices")

if not osc.started:
    osc.start()
```

## List all resources of a type

```python
resourceManager.allResources(OscDevice)
```

## Set an ExpressionVariable value

```python
existing_devices = resourceManager.allResources(ExpressionVariablesDevice)
for device in existing_devices:
    if device.path == 'objects/ExpressionVariablesDevice/PluginVariable.apx':
        for var in device.container.variables:
            if var.name == 'plugin_value':
                var.defaultFloat = {value}
                print("Updated plugin_value to %f" % {value})
                break
```

## 5x5 LED screen grid with keyframed video layers

Shows: creating `LedScreen`s and `DirectProjection` mappings, assigning screens to mappings,
setting layer resources by **field index + path string**, and writing sine-wave keyframes.

```python
def createOddEvenLEDScreenGrid(nXScreens, nYScreens, screen_size, screen_gap):
    screen_offset = screen_size + 2*screen_gap
    x_offset = (nXScreens/2)*screen_offset - screen_offset/2
    y_offset = screen_size/2

    mapping_even_path = 'objects/directprojection/even_screens_direct.apx'
    mapping_even = resourceManager.loadOrCreate(mapping_even_path, DirectProjection)
    mapping_odd_path = 'objects/directprojection/odd_screens_direct.apx'
    mapping_odd = resourceManager.loadOrCreate(mapping_odd_path, DirectProjection)

    for i in range(nYScreens):
        for j in range(nXScreens):
            new_resource = resourceManager.loadOrCreate(
                'objects/ledscreen/ledscreen_{idx}.apx'.format(idx=i*nYScreens + j), LedScreen)
            new_resource.scale = Vec(screen_size, screen_size, 0)
            new_resource.offset = Vec(-x_offset + screen_offset*j, y_offset + screen_offset*i, 0)
            new_resource.resolution = Vec(1920, 1080)
            if i % 2 == 0:
                mapping_even.screens.append(new_resource)
            else:
                mapping_odd.screens.append(new_resource)
    return [mapping_even_path, mapping_odd_path]

def createVideoLayer(layer_name, start_time_seconds, length_seconds):
    return guisystem.track.addNewLayer(VariableVideoModule, start_time_seconds, length_seconds, layer_name)

def makeSineWaveKeyFrame(layer, field, initial_value, offset_value):
    import math
    layer.fields[field].disableSequencing = False
    for i in range(1, 60):
        layer.fields[field].sequence.setFloat(
            i, offset_value + initial_value*math.sin(math.pi*((5 - (i % 10))/5.0)))

mapping_paths = createOddEvenLEDScreenGrid(5, 5, 5, 0.5)

layer_1 = createVideoLayer('layer_1', 0, 60)
layer_1.fields[10].sequence.setString(0, 'objects/videoclip/sample/george.jpg.apx')  # video
layer_1.fields[2].sequence.setString(0, mapping_paths[0])                            # mapping

layer_2 = createVideoLayer('layer_2', 0, 60)
layer_2.fields[10].sequence.setString(0, 'objects/videoclip/sample/ada.jpg.apx')
layer_2.fields[2].sequence.setString(0, mapping_paths[1])

makeSineWaveKeyFrame(layer_1, 20, 360, 0)   # Hue
makeSineWaveKeyFrame(layer_1, 36, 1, 1)     # Size
makeSineWaveKeyFrame(layer_1, 41, 90, 0)    # Rotation
makeSineWaveKeyFrame(layer_2, 20, -360, 0)
makeSineWaveKeyFrame(layer_2, 36, 1, 1)
makeSineWaveKeyFrame(layer_2, 41, -90, 0)
```

Notes:
- Field indices for `VariableVideoModule` from this snippet: `2` = mapping, `10` = video,
  `20` = hue, `36` = size, `41` = rotation. Indices can change between Designer versions -
  prefer `layer.findSequence("name")` (as this project does).
- The original snippet wraps the main block in `if __name__ == '__main__':`; inside the
  execute endpoint the script is already in a function, so just call the code directly.
  Nested `def`s are fine.

## Locate all feed rectangles (returned as JSON)

```python
import json

output = []
for scene in resourceManager.allResources(FeedScene):
    scene_info = {"Scene UID": str(scene.uid), "FeedRects": []}
    if hasattr(scene, "feedRects"):
        for rect in scene.feedRects:
            rect_info = {
                "FeedRect UID": str(rect.uid),
                "Local Position and Size": str(rect.rect) if hasattr(rect, "rect") else "Not found",
                "Screen Position and Size": str(rect.screenRect) if hasattr(rect, "screenRect") else "Not found",
                "Output Rectangle": str(rect.outputRect) if hasattr(rect, "outputRect") else "Not found"
            }
            if hasattr(rect, "referenceDisplay"):
                ref_disp = rect.referenceDisplay
                ref_info = {
                    "Reference Display": str(ref_disp),
                    "uid": str(ref_disp.uid) if hasattr(ref_disp, "uid") else "Unknown",
                    "path": str(ref_disp.path) if hasattr(ref_disp, "path") else "Unknown"
                }
                if hasattr(ref_disp, "parent"):
                    parent = ref_disp.parent
                    ref_info["Parent UID"] = str(parent.uid) if hasattr(parent, "uid") else "Unknown"
                    ref_info["Parent Path"] = str(parent.path) if hasattr(parent, "path") else "Unknown"
                rect_info["Reference Display Info"] = ref_info
            if hasattr(rect, "displayTarget"):
                disp_target = rect.displayTarget
                rect_info["Display Target Info"] = {
                    "Display Target": str(disp_target),
                    "uid": str(disp_target.uid) if hasattr(disp_target, "uid") else "Unknown"
                }
            scene_info["FeedRects"].append(rect_info)
    output.append(scene_info)

return output   # original prints json.dumps(output, indent=4); return it to get it in returnValue
```

Pattern worth reusing: `hasattr(...)` guards + `str(...)` on every uid/path/rect so the
result is JSON-serialisable.
