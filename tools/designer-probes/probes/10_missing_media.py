# What a VideoClip looks like after its media file was deleted in Designer (the clip stays in
# allResources). Dumps the clips whose path contains FILTER next to a healthy one, plus whether
# the source file exists on disk, to find a field that tells a missing clip apart.
FILTER = "abyss_lighting_"


def run():
    import os as pyos

    def dump(obj, limit=120):
        res = {}
        for a in dir(obj):
            # Designer raises an uncatchable TypeError when Python touches an 'Action' object
            if a.startswith('_') or 'Action' in a:
                continue
            try:
                v = getattr(obj, a)
            except Exception as e:
                res[a] = "ERR: " + str(e)[:80]
                continue
            try:
                if callable(v):
                    continue
                s = str(v)
            except Exception as e:
                s = "<blocked: " + str(e)[:60] + ">"
            res[a] = s[:limit]
        return res

    out = {"_summary": {"total": 0, "inError": [], "srcMissing": []}}
    for c in resourceManager.allResources(VideoClip):
        path = str(c.path)
        f = c.file
        src = None
        try:
            src = str(f.fragments[0].proxies[0].path)
        except Exception:
            pass
        summary = out["_summary"]
        summary["total"] += 1
        if c.isInError:
            summary["inError"].append({"path": path, "incomplete": bool(c.isIncomplete), "live": bool(c.isVideoIn)})
        if src and not pyos.path.exists(src):
            summary["srcMissing"].append(path)
        if FILTER not in path:
            continue
        out[path] = {
            "hasFile": bool(f),
            "src": src,
            "srcExists": pyos.path.exists(src) if src else None,
            "clip": dump(c),
            "file": dump(f) if f else None,
        }
    return out
return run()
