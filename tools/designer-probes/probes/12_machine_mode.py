# Read-only. Which machine answered, its editor mode and Locked / Independent state, and the
# GUI state "At Playhead" uses (docs/PLAN-execution-target.md, P4). Run on each machine.
def run():
    n = d3NetManager
    t = guisystem.track
    return {
        "local": n.localMachine.name,
        "localRole": int(n.localMachine.role),
        "mobileEditorMode": n.mobileEditorMode,
        "lockedToDirector": state.lockedToDirector,
        "track": str(t.path) if t else None,
        "playheadBeats": guisystem.player.tCurrent,
    }
return run()
