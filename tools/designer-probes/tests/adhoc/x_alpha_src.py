def run():
    out = {"nVideoFile": len(resourceManager.allResources(VideoFile)),
           "nVideoFileHeader": len(resourceManager.allResources(VideoFileHeader))}
    rows = []
    for vf in resourceManager.allResources(VideoFile)[:20]:
        r = {"path": str(vf.path)}
        try:
            i = vf.info
            for a in ("hasAlpha", "hasAudio", "resolution", "nChannels", "pixelFormat", "format"):
                if hasattr(i, a):
                    r["info." + a] = str(getattr(i, a))
        except Exception as e:
            r["info"] = "ERR " + str(e)[:80]
        rows.append(r)
    out["videoFiles"] = rows
    hdrs = []
    for h in resourceManager.allResources(VideoFileHeader)[:20]:
        hdrs.append({"path": str(h.path), "hasAlpha": h.hasAlpha, "hasAudio": h.hasAudio})
    out["headers"] = hdrs
    return out
return run()
