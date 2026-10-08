# Q-B: dump public non-callable attributes of one mapping per type, plus its screens,
# to find where a mapping's "resolution" lives.
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

    seen, out = set(), []
    for m in resourceManager.allResources(Projection):
        n = type(m).__name__
        if n in seen:
            continue
        seen.add(n)
        screens = []
        try:
            for s in list(m.screens)[:3]:
                screens.append({
                    "type": type(s).__name__,
                    "path": str(s.path),
                    "description": s.description,
                    "resolution": str(getattr(s, "resolution", None)),
                })
        except Exception as e:
            screens = "ERR: " + str(e)
        out.append({"type": n, "path": str(m.path), "screens": screens, "attrs": dump(m)})
    return out
return run()
