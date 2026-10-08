# Dumps layers (stack order), sequences, tags and sections of the tracks named in TRACKS, to
# compare two creation engines. Set DELETE = True to remove the tracks afterwards.
TRACKS = __TRACKS__
DELETE = __DELETE__

def dump(t):
    layers = []
    for l in t.layers:
        def res(n):
            k = l.findSequence(n).sequence.key(0)
            return str(k.r.path) if k.r else None
        br = l.findSequence("brightness")
        bks = br.sequence
        layers.append({
            "name": l.name, "tStart": round(l.tStart, 6), "tLength": round(l.tLength, 6),
            "video": res("video"), "mapping": res("mapping"),
            "mode": l.findSequence("mode").sequence.key(0).v,
            "end": l.findSequence("at end point").sequence.key(0).v,
            "brightKeys": [[round(bks.t(i), 6), bks.key(i).v] for i in range(bks.nKeys())],
            "brightSequenced": not br.disableSequencing,
        })
    tags, b = [], -1.0
    while len(tags) < 500:
        nb = t.findBeatOfNextTag(b)
        if nb <= b or nb > 1e300:
            break
        for tg in t.tagsAtBeat(nb):
            tags.append([round(nb, 6), tg.type, tg.text])
        b = nb
    return {"length": t.lengthInBeats, "layers": layers, "tags": tags,
            "sections": [round(t.sectionToBeat(i), 6) for i in range(t.nSections())]}

def run():
    out = {}
    for p in TRACKS:
        t = resourceManager.load(p, Track)
        out[p] = dump(t) if t else None
        if t and DELETE:
            resourceManager.remove(t.path)
    return out
return run()
