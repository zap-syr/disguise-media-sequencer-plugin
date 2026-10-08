# WRITE TEST (template). APPENDS __N__ fully configured layers after the last layer, without
# clearing. Run repeatedly to see whether one chunk gets slower as the track fills up
# (undo-operation close serialises track state).
import time
CLIPS = ["objects/videoclip/test/flag_center_hap.mov.apx", "objects/videoclip/sample/ada.jpg.apx"]
MAPPING = "objects/perspectiveprojection/5 (Perspective).apx"
N = __N__

def run():
    t0 = time.clock()
    track = resourceManager.load("objects/track/zz_probe_test.apx", Track)
    clips = [resourceManager.load(p, VideoClip) for p in CLIPS]
    mapping = resourceManager.load(MAPPING, Projection)
    start = max([l.tEnd for l in track.layers] or [0.0])
    base = track.nLayers()
    for i in range(N):
        clip = clips[i % len(clips)]
        length = track.timeToBeat(track.beatToTime(start) + 5.0) - start
        layer = track.addNewLayer(VariableVideoModule, start, length, "chunk %d" % (base + i))
        for n, kind, v in (("video", "r", clip), ("mapping", "r", mapping), ("mode", "f", 1),
                           ("At end point", "f", 0)):
            fs = layer.findSequence(n)
            markDirty(fs)
            fs.disableSequencing = True
            if kind == "r":
                fs.sequence.setResource(start, v)
            else:
                fs.sequence.setFloat(start, v)
            fs.saveOnDelete()
        track.setTagAtBeat(start, Tag(1, "%d" % (base + i + 1)))
        track.splitSectionAtBeat(start)
        start += length
    return {"N": N, "layersBefore": base, "layersAfter": track.nLayers(),
            "pythonMs": (time.clock() - t0) * 1000.0, "endBeat": start}
return run()
