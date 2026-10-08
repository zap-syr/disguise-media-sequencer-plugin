def run():
    t = resourceManager.load("objects/track/zz_probe_test.apx", Track)
    ls = list(t.layers)
    return {"nLayers": t.nLayers(), "nSections": t.nSections(),
            "names_first": [l.name for l in ls[:3]], "names_last": [l.name for l in ls[-3:]]}
return run()
