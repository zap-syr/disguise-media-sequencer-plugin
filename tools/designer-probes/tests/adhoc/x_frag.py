import os.path
def run():
    out = []
    for c in resourceManager.allResources(VideoClip)[:20]:
        f = c.file
        if not f:
            continue
        r = {"clip": str(c.path), "codec": str(f.codec), "assetPath": str(f.path)}
        frs = []
        for fr in list(f.fragments)[:2]:
            d = {"type": type(fr).__name__}
            for a in dir(fr):
                if a.startswith("_") or "Action" in a:
                    continue
                v = getattr(fr, a)
                if callable(v):
                    continue
                s = str(v)
                d[a] = s[:120]
                if hasattr(v, "path"):
                    d[a + ".path"] = str(v.path)
            frs.append(d)
        r["fragments"] = frs
        out.append(r)
    return {"cwdExistsCheck": os.path.exists("objects/videofile/sample/ada.jpg"), "rows": out}
return run()
