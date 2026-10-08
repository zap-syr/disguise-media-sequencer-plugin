# Q-C: dump public non-callable attributes of a video clip, a still and a live input (if any),
# and of their `file` object, to find duration / fps / resolution fields.
def run():
    def dump(obj, limit=160):
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

    picked = {}
    for c in resourceManager.allResources(VideoClip):
        try:
            live = bool(c.isVideoIn)
        except Exception:
            live = False
        try:
            frames = c.file.nFrames if c.file else 0
        except Exception:
            frames = 0
        kind = "live" if live else ("video" if frames > 1 else "still")
        if kind not in picked:
            picked[kind] = c
        if len(picked) == 3:
            break

    out = {}
    for kind, c in picked.items():
        f = None
        try:
            f = c.file
        except Exception:
            pass
        out[kind] = {
            "path": str(c.path),
            "clip": dump(c),
            "file": dump(f) if f else None,
        }
    return out
return run()
