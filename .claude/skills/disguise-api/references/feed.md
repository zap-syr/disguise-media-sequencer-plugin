# Feed (screens → physical outputs)

Source: https://developer.disguise.one/python-api/guides/feed/

> ⚠ The guide uses globals `system` and `project` (`system.scenes`, `system.machines`,
> `project.projections`, `project.meshes`). **They are not globals in d3.pyi (r34.1).**
> Use instead:
> - feed scenes: `resourceManager.allResources(FeedScene)` or `state.feed` (current `FeedScene`),
>   per machine: `machine.feed`
> - machines: `d3NetManager.machines`
> - projections / meshes: `resourceManager.allResources(FeedProjection)` / `(Mesh)`
> - match names with `.description` (resources) - see SKILL.md
>
> Always grep `references/d3.pyi` before relying on a member from this page.

## FeedScene

Top-level container of `FeedRect`s.

```python
feed_scene = next((s for s in resourceManager.allResources(FeedScene)
                   if s.description == "MyFeedScene"), None)

rects = feed_scene.feedRects                    # List[FeedRect]
new_rect = feed_scene.add()                     # new FeedRect
feed_scene.remove(rect_to_remove)
used_heads = feed_scene.getUsedHeads()          # List[int]
head_config = feed_scene.ensureHeadConfig(0, Int2(1920, 1080))   # -> FeedHeadConfig
```

## FeedRect

| Property | Meaning | Example |
|---|---|---|
| `screen` | Source screen | `feed_rect.screen = my_screen` |
| `head` | Destination output head index | `feed_rect.head = 0` |
| `rect` | Position/size on the output (`Rect`) | `feed_rect.rect.x = 100`, `feed_rect.rect.w = 1920` |
| `screenRect` | Source region on the screen (UV) | `.u = 0.0`, `.v = 0.0`, `.uw = 1.0`, `.vh = 1.0` |
| `rotationIndex` | 0=0°, 1=90°, 2=180°, 3=270° | `feed_rect.rotationIndex = 1` |
| `deformStack` | `DeformStack` for warping | `feed_rect.deformStack` |
| `mask` | `DxTexture` mask | `feed_rect.mask = mask_texture` |
| `active` | read-only bool | `feed_rect.active` |

Other attributes seen in the useful-strings dump: `outputRect`, `referenceDisplay`, `displayTarget`
(see `references/useful-strings.md` → "Locate all feed rectangles").

## FeedHeadConfig

| Property | Example |
|---|---|
| `resolution` | `head_config.resolution = Int2(1920, 1080)` |
| `clearColour` | `head_config.clearColour = Colour(0.0, 0.0, 0.0, 1.0)` |
| `framesLatency` | `head_config.framesLatency = 2` |
| `name` | `head_config.name = "Main LED"` |

## FeedProjection

A `Projection` that routes content through a `FeedScene`.

```python
feed_projection = next((p for p in resourceManager.allResources(FeedProjection)
                        if p.description == "MyFeedProjection"), None)
if feed_projection and feed_scene:
    markDirty(feed_projection)
    feed_projection.feed_scene = feed_scene
```

Assigning it to a video layer: the guide writes `video_layer.projection = feed_projection`, but
layers have no `projection` attribute in d3.pyi - use the `"mapping"` field sequence as this
project does:

```python
fseq = video_layer.findSequence("mapping")
markDirty(fseq)
fseq.disableSequencing = True
fseq.sequence.setResource(video_layer.tStart, feed_projection)
```

## VFC / output configuration (Machine)

Hardware outputs live on a `Machine` (`d3NetManager.machines[0]`, `d3NetManager.localMachine`).
The guide lists the following; names marked ⚠ are **not** in d3.pyi r34.1:

| Task (guide) | Code (guide) | Stub status |
|---|---|---|
| VFC card type | `machine.vfcCardType(0)` | ⚠ missing |
| VFC firmware | `machine.vfcFwVersion(0)` | ⚠ stub has `vfcFirmwareVersion(iSlot)` |
| VFC port count | `machine.vfcNumPorts(0)` | verify |
| VFC port settings | `machine.vfcPort(slot, port)` | verify |
| Set port format | `port_settings.videoFormat = VFC_VIDEO_FORMAT_2160p_60_00` | verify |
| Output settings | `machine.output(0)` → `OutputSettings` | verify |
| Resolution / rate | `output_settings.resolution = Int2(1920, 1080)`, `.rate = 59.94` | verify |
| Bit depth | `output_settings.bitDepth = machine.BITS_10` | verify |
| d3net feed output | `machine.d3net.outputEnabled = True`, `.outputAddress = "10.0.1.100"` | ⚠ missing |

Stub-confirmed VFC helpers on `Machine` include: `vfcFirmwareVersion`, `vfcGeneration`,
`vfcFPGATemperature`, `vfcMacAddress`, `vfcPortDisplayModes(iSlot, iPort)`,
`vfcPortCurrentDisplayMode`, `vfcPortSelectedDisplayMode`, `vfcPortLed`.

## Warping: DeformStack

```python
deform_stack = feed_rect.deformStack
deform_stack.clear()

lens = deform_stack.add(DeformStackItem_Lens)
if lens:
    lens.enabled = True
    lens.amount = 0.5

circular = deform_stack.add(DeformStackItem_Circular)
if circular:
    circular.innerRadius = 0.2
    circular.outerRadius = 0.8

mesh_deform = deform_stack.add(DeformStackItem_Mesh)
mesh = next((m for m in resourceManager.allResources(Mesh)
             if m.description == "MyWarpMesh.obj"), None)
if mesh_deform and mesh:
    mesh_deform.mesh = mesh
```

Remember `markDirty(...)` before changes and `saveOnDelete()` on the owning named
`FeedScene`.
