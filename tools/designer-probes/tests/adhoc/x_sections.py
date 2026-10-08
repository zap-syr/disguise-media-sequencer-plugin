def run():
    t = resourceManager.load("objects/track/zz_probe_test.apx", Track)
    n = t.nSections()
    beats = [t.sectionToBeat(i) for i in range(n)]
    ends = sorted(l.tEnd for l in t.layers)
    tags = []
    b = -1.0
    for _ in range(2000):
        nb = t.findBeatOfNextTag(b)
        if nb <= b or nb < 0:
            break
        tags.append(nb)
        b = nb
    return {"lengthInBeats": t.lengthInBeats, "nSections": n, "firstSections": beats[:5],
            "lastSections": beats[-5:], "maxLayerEnd": ends[-1] if ends else None,
            "nTagBeats": len(tags), "lastTagBeats": tags[-3:]}
return run()
