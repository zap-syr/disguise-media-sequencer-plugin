# Inspect (and optionally delete) the track the UI test created: objects/track/zz_ui_test.apx
DELETE = __DELETE__
def run():
    t = resourceManager.load("objects/track/zz_ui_test.apx", Track)
    if not t:
        return {"found": False}
    layers = []
    for l in t.layers:
        def r(n):
            k = l.findSequence(n).sequence.key(0)
            return str(k.r.path) if k.r else None
        layers.append({"name": l.name, "tStart": l.tStart, "tLength": l.tLength,
                       "video": r("video"), "mapping": r("mapping"),
                       "mode": l.findSequence("mode").sequence.key(0).v,
                       "end": l.findSequence("at end point").sequence.key(0).v})
    out = {"found": True, "layers": layers,
           "sections": [t.sectionToBeat(i) for i in range(t.nSections())]}
    if DELETE:
        resourceManager.remove(t.path)
        out["deleted"] = True
    return out
return run()
