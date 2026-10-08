def run():
    t = resourceManager.load("objects/track/zz_probe_test.apx", Track)
    for l in list(t.layers):
        t.removeLayer(l)
    t.removeTags(0.0, 100000.0)
    before = t.lengthInBeats
    # layers crossing and beyond the end WITHOUT extending
    a = t.addNewLayer(VariableVideoModule, before - 5.0, 20.0, "crosses end, not extended")
    b = t.addNewLayer(VariableVideoModule, before + 50.0, 20.0, "beyond end, not extended")
    res = {"lengthBefore": before,
           "notExtended": [{"name": l.name, "tStart": l.tStart, "tLength": l.tLength} for l in (a, b)]}
    # fix the broken ones by extending first, then re-setting extents
    markDirty(t)
    t.lengthInBeats = before + 200.0
    res["lengthAfterSet"] = t.lengthInBeats
    c = t.addNewLayer(VariableVideoModule, before + 50.0, 20.0, "beyond old end, extended")
    a.setExtents(before - 5.0, before + 15.0)
    res["extended"] = [{"name": l.name, "tStart": l.tStart, "tLength": l.tLength} for l in (a, b, c)]
    # does a later layer past the new end auto-extend the track?
    d = t.addNewLayer(VariableVideoModule, before + 190.0, 50.0, "crosses new end")
    res["crossesNewEnd"] = {"tStart": d.tStart, "tLength": d.tLength, "trackLen": t.lengthInBeats}
    return res
return run()
