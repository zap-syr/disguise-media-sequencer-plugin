# Video input (live capture)

Source: https://developer.disguise.one/python-api/guides/video-input/

Live inputs appear as `VideoClip` resources with `isVideoIn == True` - relevant to this
plugin's media grid (you may want to badge or filter them).

```python
def run():
    result = []
    for clip in resourceManager.allResources(VideoClip):
        if clip.isVideoIn:
            vin = clip.Video_Input.localVideoIn
            fmt = vin.videoInFormat
            result.append({
                "path": str(clip.path),
                "source": vin.name,
                "resolution": str(fmt.resolution),
                "framerate": fmt.framerate,
                "pixelFormat": str(fmt.pixelFormat),
                "hardwareId": str(vin.hardwareId),
            })
    return result
return run()
```

## Per-clip input (`clip.Video_Input.localVideoIn`)

| Task | Code |
|---|---|
| Is live input? | `clip.isVideoIn` |
| Source name | `clip.Video_Input.localVideoIn.name` |
| Resolution / fps / pixel format | `...localVideoIn.videoInFormat.resolution` / `.framerate` / `.pixelFormat` |
| Hardware ID | `...localVideoIn.hardwareId` |
| Assign input device | `clip.Video_Input.localVideoIn = video_in_device` |
| Set format (res, interlaced, pixfmt) | `...localVideoIn.setFormat(Vec2(1920, 1080), False, "YUV422")` |
| Pixel format | `...localVideoIn.pixelFormat = "RGB24"` |
| Resolution | `...localVideoIn.resolution = Vec2(1280, 720)` |
| Frame rate | `...localVideoIn.videoInFormat.framerate = 29.97` |
| Crop | `...localVideoIn.cropRectangle = Rect(0, 0, 640, 480)` |
| ACES transform | `...localVideoIn.acesTransform = AcesInputTransformParameters(type, space, curve)` |
| Preview frame | `...localVideoIn.getPreviewFrame(Int2(320, 180))` |

## System level

The guide calls these on `VideoInSystem` directly. In d3.pyi `VideoInSystem` is a
`Subsystem` with instance members, so get the instance first:

```python
vis = subsystems.getSystem(VideoInSystem)     # SubsystemManager.getSystem / maybeGetSystem
```

| Task | Code |
|---|---|
| Input channels | `vis.inputChannels` |
| Find by hardware ID | `vis.findVideoIn(hardwareId)` |
| Capture groups available | `vis.captureGroupsAvailable` |
| Auto-mapped channels | `vis.autoMappedChannels` |
| Hardware IDs for a device | `vis.getHardwareIds(hardwareId)` |
| Teamed input ID | `vis.makeTeamedVideoInHardwareId([id1, id2])` |
| Multiview input ID | `vis.makeMultiviewVideoInHardwareId(sourceHardware, regionOfInterest)` |
| Logical devices (static) | `VideoInDeviceMap.getLogicalDevices()` |

Check `references/d3.pyi` for exact signatures (static vs instance) before shipping code.
