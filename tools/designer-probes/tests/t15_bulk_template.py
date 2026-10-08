# WRITE TEST (template). Creates __N__ fully configured layers in ONE call, like createLayers does:
# video + mapping + mode + end + brightness fade, cue tag and split per layer.
# Run through bulk.sh which substitutes __N__ and reads the time from d3Log.
import time
CLIPS = ["objects/videoclip/test/flag_center_hap.mov.apx", "objects/videoclip/sample/ada.jpg.apx"]
MAPPING = "objects/perspectiveprojection/5 (Perspective).apx"
N = __N__

def run():
    t0 = time.clock()
    track = resourceManager.load("objects/track/zz_probe_test.apx", Track)
    for l in list(track.layers):
        track.removeLayer(l)
    track.removeTags(0.0, track.lengthInBeats + 1.0)
    t_clear = time.clock() - t0

    clips = [resourceManager.load(p, VideoClip) for p in CLIPS]
    mapping = resourceManager.load(MAPPING, Projection)
    start = 0.0
    t1 = time.clock()
    for i in range(N):
        clip = clips[i % len(clips)]
        length = track.timeToBeat(track.beatToTime(start) + 5.0) - start
        layer = track.addNewLayer(VariableVideoModule, start, length, "bulk %d" % i)
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
        fs = layer.findSequence("Brightness")
        markDirty(fs)
        fs.disableSequencing = False
        fs.sequence.setFloat(start, 0)
        fs.sequence.setFloat(start + 1.0, 1)
        fs.saveOnDelete()
        track.setTagAtBeat(start, Tag(1, "%d" % (i + 1)))
        track.splitSectionAtBeat(start)
        start += length
    t_create = time.clock() - t1
    return {"N": N, "clearMs": t_clear * 1000.0, "createMs": t_create * 1000.0,
            "msPerLayer": t_create * 1000.0 / N if N else 0, "nLayers": track.nLayers(),
            "nSections": track.nSections()}
return run()
