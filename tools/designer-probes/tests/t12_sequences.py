# WRITE TEST. Sequence names of a VariableVideoModule layer, findSequence case-sensitivity,
# default values on a fresh layer, and setting video / mapping / mode / end / brightness.
CLIP = "objects/videoclip/test/flag_center_hap.mov.apx"
MAPPING = "objects/perspectiveprojection/5 (Perspective).apx"

def run():
    track = resourceManager.load("objects/track/zz_probe_test.apx", Track)
    for l in list(track.layers):
        track.removeLayer(l)
    layer = track.addNewLayer(VariableVideoModule, 0.0, 10.0, "seq test")

    def val(fs):
        ks = fs.sequence
        out = {"nKeys": ks.nKeys(), "disableSequencing": fs.disableSequencing}
        out["seqType"] = type(ks).__name__
        if ks.nKeys() == 0:
            return out
        k = ks.key(0)
        kt = type(k).__name__
        out["keyType"] = kt
        if kt == "KeyResource":
            r = k.r
            out["key0.r"] = str(r.path) if r else None
        elif kt in ("KeyFloat", "Key"):
            out["key0.v"] = k.v
        if type(ks).__name__ == "FloatSequence":
            out["eval(0)"] = fs.eval(0.0, 0)
        return out

    names = [s.name for s in layer.fields]

    lookups = {}
    for n in ("video", "Video", "mapping", "Mapping", "mode", "Mode", "At end point", "at end point",
              "Brightness", "brightness", "volume", "opacity"):
        lookups[n] = layer.findSequence(n) is not None

    defaults = {}
    for n in ("video", "mapping", "mode", "At end point", "Brightness"):
        fs = layer.findSequence(n)
        defaults[n] = val(fs) if fs else None

    clip = resourceManager.load(CLIP, VideoClip)
    mapping = resourceManager.load(MAPPING, Projection)
    for n, kind, v in (("video", "r", clip), ("mapping", "r", mapping), ("mode", "f", 0),
                       ("At end point", "f", 2)):
        fs = layer.findSequence(n)
        markDirty(fs)
        fs.disableSequencing = True
        if kind == "r":
            fs.sequence.setResource(0.0, v)
        else:
            fs.sequence.setFloat(0.0, v)
        fs.saveOnDelete()
    fs = layer.findSequence("Brightness")
    markDirty(fs)
    fs.disableSequencing = False
    fs.sequence.setFloat(0.0, 0)
    fs.sequence.setFloat(2.0, 1)
    fs.saveOnDelete()

    after = {}
    for n in ("video", "mapping", "mode", "At end point", "Brightness"):
        after[n] = val(layer.findSequence(n))
    after["Brightness keyTimes"] = [layer.findSequence("Brightness").sequence.t(i)
                                    for i in range(layer.findSequence("Brightness").sequence.nKeys())]

    return {
        "loadedClip": clip is not None,
        "loadedMapping": mapping is not None,
        "sequenceNames": names,
        "findSequence": lookups,
        "defaultsOnFreshLayer": defaults,
        "afterSet": after,
    }
return run()
