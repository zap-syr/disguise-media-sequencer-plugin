# Layers of the GUI track: list order vs time, module types, sequence names of a video layer.
# Answers "where does addNewLayer put a layer in the stack" when compared before/after a create.
def run():
    track = guisystem.track
    layers = []
    video_seq_names = None
    for i, l in enumerate(track.layers):
        try:
            mt = l.moduleType()
            mt_name = mt.__name__ if hasattr(mt, "__name__") else str(mt)
        except Exception as e:
            mt_name = "ERR: " + str(e)
        layers.append({
            "index": i,
            "name": l.name,
            "module": mt_name,
            "tStart": l.tStart,
            "tLength": l.tLength,
            "enabled": l.enabled,
        })
        if video_seq_names is None and mt_name == "VariableVideoModule":
            try:
                video_seq_names = [s.name for s in l.fields]
            except Exception as e:
                video_seq_names = "ERR: " + str(e)
    return {
        "track": str(track.path),
        "layerCount": len(layers),
        "layers": layers[:60],
        "variableVideoModuleSequenceNames": video_seq_names,
        "tags": _tags(track),
    }

def _tags(track):
    # track.tags is Resource.tags (resource labels), not timeline tags: walk the timeline instead
    out, b = [], -1.0
    while len(out) < 30:
        nb = track.findBeatOfNextTag(b)
        if nb <= b or nb > 1e300:
            break
        out.extend({"beat": nb, "type": t.type, "text": t.text} for t in track.tagsAtBeat(nb))
        b = nb
    return out

return run()
