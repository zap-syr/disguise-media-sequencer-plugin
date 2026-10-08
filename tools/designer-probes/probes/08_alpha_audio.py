# Alpha / audio flags for every clip: clip.file.hasAlpha, clip.hasAudio, clip.file.hasAudio,
# plus the audio channel count when an AudioTrack is attached.
def run():
    rows = []
    for c in resourceManager.allResources(VideoClip):
        r = {"path": str(c.path)}
        f = c.file
        r["file.hasAlpha"] = bool(f.hasAlpha) if f else None
        r["clip.hasAudio"] = bool(c.hasAudio)
        r["file.hasAudio"] = bool(f.hasAudio) if f else None
        r["file.codec"] = str(f.codec) if f else None
        r["file.bitDepth"] = f.bitDepth if f else None
        r["file.audioSampleRate"] = f.audioSampleRate if f else None
        r["file.proxyInfo"] = str(f.proxyInfo) if f else None
        tracks = []
        for t in list(c.audioTracks)[:4]:
            info = {"path": str(t.path)}
            try:
                h = t.header
                info["nChannels"] = h.nChannels
                info["sampleRate"] = getattr(h, "sampleRate", None)
            except Exception as e:
                info["header"] = "ERR " + str(e)[:80]
            tracks.append(info)
        r["audioTracks"] = tracks
        rows.append(r)
    return {
        "count": len(rows),
        "withAlpha": len([r for r in rows if r["file.hasAlpha"]]),
        "withAudio": len([r for r in rows if r["clip.hasAudio"]]),
        "clipVsFileAudioMismatch": [r["path"] for r in rows if r["clip.hasAudio"] != r["file.hasAudio"]],
        "rows": rows,
    }
return run()
