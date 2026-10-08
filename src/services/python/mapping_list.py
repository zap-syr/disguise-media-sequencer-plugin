# getMappingList(): user mappings (objects/ only; Designer also auto-creates internal/ ones)
# with type and resolution. Runnable as a probe:
#   node tools/designer-probes/run.mjs src/services/python/mapping_list
def run():
    out = []
    for m in resourceManager.allResources(Projection):
        path = str(m.path)
        if not path.lower().startswith("objects/"):
            continue
        t = type(m)
        res = m.resolution
        out.append({
            "uid": "0x%x" % m.uid,
            "path": path,
            "description": m.description,
            "type": t.__name__,
            "typeLabel": getattr(t, "__username__", t.__name__),
            "res": "%dx%d" % (int(res.x), int(res.y)),
        })
    return out
return run()
