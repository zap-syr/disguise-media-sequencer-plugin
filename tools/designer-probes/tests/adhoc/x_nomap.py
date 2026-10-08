def run():
    t = resourceManager.load("objects/track/zz_probe_test.apx", Track)
    for l in list(t.layers):
        t.removeLayer(l)
    out = {}
    l1 = t.addNewLayer(VariableVideoModule, 0.0, 10.0, "default mapping 1")
    l2 = t.addNewLayer(VariableVideoModule, 0.0, 10.0, "default mapping 2")
    def mp(l):
        r = l.findSequence("mapping").sequence.key(0).r
        return str(r.path) if r else None
    out["defaults"] = [mp(l1), mp(l2)]
    fs = l2.findSequence("mapping")
    markDirty(fs)
    try:
        fs.sequence.setResource(0.0, None)
        out["setResource(None)"] = "ok"
    except Exception as e:
        out["setResource(None)"] = "ERR " + str(e)[:120]
    fs.saveOnDelete()
    out["afterClear"] = mp(l2)
    out["projectionCount"] = len([p for p in resourceManager.allResources(Projection) if str(p.path).startswith("objects/")])
    return out
return run()
