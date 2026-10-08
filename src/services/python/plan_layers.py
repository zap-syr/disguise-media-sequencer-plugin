# createLayerPlan step 2: create one chunk (<= 100) of layers whose beats were computed by
# plan_prepare.py. The first chunk also extends the track: Designer does NOT grow a track, and
# layers past lengthInBeats end up truncated or zero-length (verified, docs §12).
# __ARGS__ = {"trackPath": str, "ensureLength": beats|None,
#             "layers": [{"clipPath", "mappingPath"|None, "mode", "end", "bright",
#                         "start", "length", "fadeLength"}]}
import json

ARGS = json.loads(__ARGS__)


def s(value):
    return value.encode("utf-8") if isinstance(value, unicode) else value


def set_static(layer, name, beat, value, is_resource):
    fseq = layer.findSequence(name)
    if not fseq:
        return
    markDirty(fseq)
    fseq.disableSequencing = True
    if is_resource:
        fseq.sequence.setResource(beat, value)
    else:
        fseq.sequence.setFloat(beat, value)
    fseq.saveOnDelete()


def run():
    track = resourceManager.load(s(ARGS["trackPath"]), Track)
    if not track:
        return {"status": "error", "message": "Could not load target track"}

    ensure = ARGS.get("ensureLength")
    if ensure is not None and track.lengthInBeats < ensure:
        markDirty(track)
        track.lengthInBeats = ensure

    mapping_cache = {}
    created = 0
    errors = []
    for L in ARGS["layers"]:
        clip = resourceManager.load(s(L["clipPath"]), VideoClip)
        if not clip:
            errors.append({"clipPath": L["clipPath"], "message": "clip not found"})
            continue
        start = L["start"]
        layer = track.addNewLayer(VariableVideoModule, start, L["length"],
                                  "Video Layer - {}".format(clip.description))
        if not layer:
            errors.append({"clipPath": L["clipPath"], "message": "addNewLayer failed"})
            continue

        mapping_path = L.get("mappingPath")
        mapping = None
        if mapping_path:
            if mapping_path not in mapping_cache:
                mapping_cache[mapping_path] = resourceManager.load(s(mapping_path), Projection)
            mapping = mapping_cache[mapping_path]
            if not mapping:
                errors.append({"clipPath": L["clipPath"], "message": "mapping not found: " + mapping_path})
        # Designer pre-fills a mapping on new layers: set None explicitly for "no mapping"
        set_static(layer, "mapping", start, mapping, True)
        set_static(layer, "video", start, clip, True)
        set_static(layer, "mode", start, L["mode"], False)
        set_static(layer, "at end point", start, L["end"], False)

        if L["bright"]:
            fseq = layer.findSequence("brightness")
            if fseq:
                markDirty(fseq)
                fseq.disableSequencing = False
                fseq.sequence.setFloat(start, 0)
                fseq.sequence.setFloat(start + L["fadeLength"], 1)
                fseq.saveOnDelete()
        created += 1

    return {"status": "success", "created": created, "errors": errors}

return run()
