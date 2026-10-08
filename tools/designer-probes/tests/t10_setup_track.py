# WRITE TEST. Creates (or empties) the scratch track objects/track/zz_probe_test.apx.
# Every write test works only on this track; t99_cleanup.py deletes it.
def run():
    track = resourceManager.loadOrCreate("objects/track/zz_probe_test.apx", Track)
    removed = 0
    for l in list(track.layers):
        track.removeLayer(l)
        removed += 1
    track.removeTags(0.0, track.lengthInBeats + 1.0)
    return {
        "track": str(track.path),
        "removedLayers": removed,
        "bpm": track.bpm,
        "lengthInBeats": track.lengthInBeats,
        "lengthInSec": track.lengthInSec,
        "nSections": track.nSections(),
        "nLayers": track.nLayers(),
    }
return run()
