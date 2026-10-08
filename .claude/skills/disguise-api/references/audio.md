# Audio

Source: https://developer.disguise.one/python-api/guides/audio/

> ⚠ The guide's "system-level" examples use a `system` global (`system.audioOut`,
> `system.audioTracks`, `system.machines`, `system.resetAudio()`) that **does not exist** in
> d3.pyi r34.1. Stub equivalents: `resourceManager.allResources(AudioTrack)`,
> `d3NetManager.machines`, `DeviceMapping.audioOut` (`AudioOutDeviceMap2`),
> `VideoPlayer.resetAudio()`. Grep `references/d3.pyi` before using.

## Resources

| Type | Members |
|---|---|
| `AudioTrack` | `audio_track.audioFile` → `AudioFile`; `audio_track.header` → `AudioInfo` |
| `AudioFile` | `audio_file.header` → `AudioInfo` (sample rate, bit depth …) |
| `AudioAnalyser` (device) | `audio_analyser.lines` → `List[AudioLine]` (frequency bands) |
| `VideoClip` | `video_clip.hasAudio` (embedded audio?), `video_clip.audioTracks` |

All audio tracks: `resourceManager.allResources(AudioTrack)`.

`AudioLine` data is used from expressions: `audioline:my-audio.c[0]` (e.g. bass level) -
see `references/expressions.md`.

## Volume

Layer volume is a sequenced property (`"volume"` field) - same rules as any FieldSequence
(see SKILL.md): keyframe times are **track beats**.

```python
audio_layer = next((l for l in guisystem.track.layers if l.name == "MyAudioLayer"), None)
if audio_layer:
    vol_seq = audio_layer.findSequence("volume")
    if vol_seq:
        markDirty(vol_seq)
        vol_seq.disableSequencing = True              # static value
        vol_seq.sequence.setFloat(audio_layer.tStart, 0.5)
        vol_seq.saveOnDelete()
```

(The guide sets `disableSequencing = False` and writes a key at `0.0`; for a constant value
`True` + key at `layer.tStart` is the documented pattern.)

Fade: `disableSequencing = False` + `setFloat` at two beats (cf. brightness fade in this project).

Master volume:
```python
guisystem.currentTransportManager.volume = 0.8
# or via command: TransportCommand.makeVolume(state, tm, 0.8) + tm.addCommand(...)
```

A `TransportVolumeLocal` layer on the track can also carry master volume via its `"volume"` sequence.

## Map a logical audio output to a physical output (guide example, uses `system`)

```python
logical_device = next((d for d in system.audioOut.outputs
                       if d.description == "L-Acoustics P1"), None)
if logical_device:
    machine_output = next((o for o in system.machines[0].audio.outputs
                           if o.description == "Dante PCIe RX (machine-name)"), None)
    if machine_output:
        patch = logical_device.patch
        patch.device = machine_output
        patch.channel = 0   # e.g. Left
```

Replace `system.machines` with `d3NetManager.machines` and resolve `audioOut` through the
`DeviceMapping` resource - verify in d3.pyi.
