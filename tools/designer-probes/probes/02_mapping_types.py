# Q-A: which Projection subclasses exist in the project, their user-facing names and a sample of each.
def run():
    out = {}
    for m in resourceManager.allResources(Projection):
        t = type(m)
        key = t.__name__
        if key not in out:
            out[key] = {
                "username": getattr(t, "__username__", key),
                "count": 0,
                "samples": [],
            }
        out[key]["count"] += 1
        if len(out[key]["samples"]) < 3:
            out[key]["samples"].append({"path": str(m.path), "description": m.description})
    return out
return run()
