# Transports

Source: https://developer.disguise.one/python-api/guides/transports/

## TransportManager

The central hub for all transport activity. Access it from `guisystem`:

```python
transport_manager = guisystem.currentTransportManager
current_track      = transport_manager.track
play_mode          = transport_manager.play_mode
timecode_transport = transport_manager.timecode           # TimecodeTransport
local_transports   = transport_manager.local_transports   # [EventTransport] - local signals
remote_transports  = transport_manager.remote_transports  # [EventTransport] - remote signals
```

## Timecode transport

```python
current_timecode = timecode_transport.timecode
status           = timecode_transport.statusString
fps              = timecode_transport.SMPTE_clock_type   # SMPTE (LTC) timecode only
```

## Event transports (OSC, MIDI, ...)

Iterate `local_transports` / `remote_transports` to find the one you need:

```python
osc_transport = next((t for t in transport_manager.remote_transports
                      if isinstance(t, EventTransportOSC)), None)
if osc_transport:
    play = osc_transport.play
    for output in osc_transport.outputs:
        print("Address: {}, Expression: {}".format(output.address, output.expr.expression))
```

## Triggering transport commands

`TransportCommand` static factory methods build a command; **it does nothing until added to a
manager**. `source` should always be `state` (other sources are internal, for filtering/logging).

```python
tm = guisystem.currentTransportManager
cmd = TransportCommand.makeJumpToTime(state, tm, 10.0)
tm.addCommand(cmd)
```

> Critical: the `transport_manager` passed to the command must be the **same** one you call
> `addCommand` on.

| Action | Factory |
|---|---|
| Jump to frame | `TransportCommand.makeJumpToFrame(source, tm, tFrame)` |
| Jump to time (seconds) | `TransportCommand.makeJumpToTime(source, tm, tSec)` |
| Jump to beat | `TransportCommand.makeJumpToBeat(source, tm, tBeat)` |
| Set play mode | `TransportCommand.makePlayMode(source, tm, mode)` |
| Set speed | `TransportCommand.makeSetSpeed(source, tm, speed)` |
| Set transport brightness | `TransportCommand.makeBrightness(source, tm, brightness)` |
| Set transport volume | `TransportCommand.makeVolume(source, tm, volume)` |
| Nudge by frames | `TransportCommand.makeNudgeFrame(source, tm, deltaFrame)` |
| Nudge by beats | `TransportCommand.makeNudgeBeat(source, tm, deltaBeat)` |
| Nudge by sections | `TransportCommand.makeNudgeSection(source, tm, deltaSection)` |
| Nudge by tracks | `TransportCommand.makeNudgeTrack(source, tm, deltaTrack)` |
| Jump to cue `xx.yy.zz` | `TransportCommand.makeJumpToCue(source, tm, xx, yy, zz, cue_mode)` |
| Jump to MIDI note | `TransportCommand.makeJumpToMidiNote(source, tm, search_channel_1, search_channel_2, note, cue_mode)` |

`makeJumpToCue` and `makeJumpToMidiNote` return `None` if the cue/note isn't a valid trigger -
always check before `addCommand`:

```python
def run():
    tm = guisystem.currentTransportManager
    cmd = TransportCommand.makeJumpToCue(state, tm, 1, 2, 0, cue_mode)
    if cmd is None:
        return {"status": "error", "message": "Cue not found"}
    tm.addCommand(cmd)
    return {"status": "success"}
return run()
```

Enum arguments (from d3.pyi):
- `makePlayMode(source, tm, mode: PlayMode)` - `PlayMode(m: int)`, where the int indexes
  `[Play, PlaySection, LoopSection, Stop, HoldSection, HoldEnd]` → e.g. `PlayMode(0)` = Play,
  `PlayMode(3)` = Stop.
- `makeJumpToCue(..., cueMode: CueMode)` / `makeJumpToMidiNote(source, tm, iSearchChannel1,
  iSearchChannel2, iNote, cueMode)` - `CueMode` has no class in the stubs; check the
  `TransportCommand` reference page before relying on values.

```python
tm = guisystem.currentTransportManager
tm.addCommand(TransportCommand.makePlayMode(state, tm, PlayMode(0)))   # play
tm.addCommand(TransportCommand.makePlayMode(state, tm, PlayMode(3)))   # stop
```

Master volume can also be set directly: `tm.volume = 0.8`.

Reference: `/python-api/docs/transportmanager`, `/python-api/docs/timecodetransport`,
`/python-api/docs/transportcommand`.
