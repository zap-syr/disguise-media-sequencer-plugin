# Project overview: counts, refresh rate, current track / playhead, tracks.
def run():
    def safe(fn, default=None):
        try:
            return fn()
        except Exception as e:
            return "ERR: " + str(e)

    counts = {}
    for name, t in (("VideoClip", VideoClip), ("Projection", Projection), ("Track", Track),
                    ("Projector", Projector), ("FeedScene", FeedScene)):
        counts[name] = safe(lambda: len(resourceManager.allResources(t)))

    track = guisystem.track
    return {
        "project": safe(lambda: state.projectName),
        "counts": counts,
        "globalRefreshRate": safe(lambda: state.globalRefreshRate.asDouble),
        "guiTrack": safe(lambda: str(track.path)),
        "guiTrackDescription": safe(lambda: track.description),
        "guiTrackLengthBeats": safe(lambda: track.lengthInBeats),
        "guiTrackLayers": safe(lambda: len(track.layers)),
        "playheadBeats": safe(lambda: guisystem.player.tCurrent),
        "trackTimeSeconds": safe(lambda: trackTime()),
        "beatToTime(playhead)": safe(lambda: track.beatToTime(guisystem.player.tCurrent)),
        "timeToBeat(10s)": safe(lambda: track.timeToBeat(10.0)),
        "tracks": safe(lambda: [{"path": str(t.path), "description": t.description}
                                for t in resourceManager.allResources(Track)]),
    }
return run()
