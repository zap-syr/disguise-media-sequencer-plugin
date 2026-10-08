# WRITE TEST. Seconds <-> beats when the track BPM is not 60.
def run():
    track = resourceManager.load("objects/track/zz_probe_test.apx", Track)
    out = {"bpmBefore": track.bpm}
    for bpm in (120.0, 90.0, 60.0):
        markDirty(track)
        track.bpm = bpm
        out["bpm=%d" % int(bpm)] = {
            "bpm": track.bpm,
            "timeToBeat(10s)": track.timeToBeat(10.0),
            "beatToTime(10b)": track.beatToTime(10.0),
            "bpmAt(0)": track.bpmAt(0.0),
        }
    return out
return run()
