# createLayerPlan step 1 (read-only): resolve the track, compute every layer's start/length in
# track beats, the tag and split positions, and the track length the plan needs.
# __ARGS__ is replaced by disguiseService.runScript() with a JSON string literal.
#
# ARGS = {
#   "insert": {"mode": "playhead" | "specific", "trackPath": str|None, "timecode": [h, m, s, f]},
#   "splitEnabled": bool,
#   "tags": {"tc": {"on", "start", "increment"}, "cue": {"on", "value"}, "midi": {"on", "value"}},
#   "groups": [{"timing": "seq"|"same", "overlap": sec, "tagAt": "file"|"group",
#               "splitAt": "file"|"group",
#               "layers": [{"clipPath", "mappingPath"|None, "mode", "end", "bright", "brightT",
#                           "fit", "movieDur", "stillDur"}]}]
# }
#
# Timing rules (docs/PLAN-ui-redesign.md §2.7, §4.3, §11):
#   seq : start = cursor; cursor = max(gStart, start + length - overlap)
#   same: every layer starts at gStart
#   group end = end of its LONGEST layer; the next group starts there.
#   Splits "file": at every layer start + closing split (seq: the cursor, same: group end).
#   Splits "group": one split at the group start; the last placed group also gets a closing
#   split at its end (the next group would start there), like the "file" closing split.
#   Tags "file": at every unique layer start; "group": at the group start. Numbering is
#   continuous across the plan (i-th placed tag), like 1.1.x.
# Creation order: 'same' groups are reversed, because addNewLayer always puts the new layer on
# top of the stack, so the first row ends up on top.
import json

ARGS = json.loads(__ARGS__)


def s(value):
    return value.encode("utf-8") if isinstance(value, unicode) else value


def secs_to_beats(track, start_beats, secs):
    return track.timeToBeat(track.beatToTime(start_beats) + secs) - start_beats


def clip_seconds(clip, L):
    # Same rule as createLayers 1.1.x: videos have nFrames > 1 and fps > 1; live inputs (fps 0)
    # and stills get the still duration.
    if clip.file and clip.file.nFrames > 1 and clip.fileFps > 1:
        if L["fit"]:
            return float(clip.file.nFrames) / clip.fileFps
        return float(L["movieDur"])
    return float(L["stillDur"])


def tc_to_frames(tc, fps):
    p = [int(x) for x in tc.split(":")]
    return ((p[0] * 3600) + (p[1] * 60) + p[2]) * fps + p[3]


def frames_to_tc(total, fps):
    fr = total % fps
    sc = (total // fps) % 60
    mn = (total // fps // 60) % 60
    hr = total // fps // 3600
    return "{:02d}:{:02d}:{:02d}:{:02d}".format(hr, mn, sc, fr)


def bump_last(value, i):
    # "1.2.3" + i -> "1.2.(3+i)"; non-numeric values are used as-is (same as 1.1.x)
    try:
        parts = value.split(".")
        parts[-1] = str(int(parts[-1]) + i)
        return ".".join(parts)
    except Exception:
        return value


def run():
    ins = ARGS["insert"]
    if ins["mode"] == "specific":
        track = resourceManager.load(s(ins["trackPath"]), Track)
        if not track:
            return {"status": "error", "message": "Could not load target track"}
        refresh_rate = state.globalRefreshRate.asDouble
        fps = refresh_rate / 2.0 if refresh_rate > 30 else refresh_rate
        h, m, sec, f = ins["timecode"]
        start_seconds = (h * 3600) + (m * 60) + sec + (f / fps)
        start = track.timeToBeat(start_seconds)
    else:
        track = guisystem.track
        if not track:
            return {"status": "error", "message": "No track is selected in Designer"}
        start = guisystem.player.tCurrent

    refresh_rate_val = state.globalRefreshRate.asDouble
    tag_fps = int(refresh_rate_val / 2.0 if refresh_rate_val > 30 else refresh_rate_val)

    tags_cfg = ARGS["tags"]
    layers_out = []
    split_beats = []
    tag_beats = []
    errors = []
    cursor = start
    max_end = start
    closing_end = None  # end of the last placed group when it splits at the group start

    for gi, g in enumerate(ARGS["groups"]):
        seq = g["timing"] == "seq"
        g_start = cursor
        t = g_start
        g_end = g_start
        ov = secs_to_beats(track, g_start, float(g["overlap"])) if seq else 0.0
        starts = []
        group_layers = []
        for L in g["layers"]:
            clip = resourceManager.load(s(L["clipPath"]), VideoClip)
            if not clip:
                errors.append({"clipPath": L["clipPath"], "message": "clip not found"})
                continue
            st = t if seq else g_start
            length = secs_to_beats(track, st, clip_seconds(clip, L))
            if seq:
                t = max(g_start, st + length - ov)
            g_end = max(g_end, st + length)
            fade = secs_to_beats(track, st, float(L["brightT"])) if L["bright"] else 0.0
            group_layers.append({
                "group": gi, "clipPath": L["clipPath"], "mappingPath": L.get("mappingPath"),
                "mode": L["mode"], "end": L["end"], "bright": L["bright"],
                "start": st, "length": length, "fadeLength": fade,
            })
            if st not in starts:
                starts.append(st)
        if not group_layers:
            continue
        if not seq:
            group_layers.reverse()
        layers_out.extend(group_layers)
        max_end = max(max_end, g_end)

        if g["splitAt"] == "file":
            split_beats.extend(starts)
            split_beats.append(t if seq else g_end)
            closing_end = None
        else:
            split_beats.append(g_start)
            closing_end = g_end

        tag_beats.extend(starts if g["tagAt"] == "file" else [g_start])
        cursor = g_end

    if closing_end is not None:
        split_beats.append(closing_end)

    tags = []
    if tags_cfg["tc"]["on"]:
        start_f = tc_to_frames(tags_cfg["tc"]["start"], tag_fps)
        inc_f = tc_to_frames(tags_cfg["tc"]["increment"], tag_fps)
        for i, b in enumerate(tag_beats):
            tags.append({"beat": b, "type": 0, "text": frames_to_tc(start_f + i * inc_f, tag_fps)})
    if tags_cfg["cue"]["on"]:
        for i, b in enumerate(tag_beats):
            tags.append({"beat": b, "type": 1, "text": bump_last(tags_cfg["cue"]["value"], i)})
    if tags_cfg["midi"]["on"]:
        for i, b in enumerate(tag_beats):
            tags.append({"beat": b, "type": 2, "text": bump_last(tags_cfg["midi"]["value"], i)})

    splits = sorted(set(split_beats)) if ARGS["splitEnabled"] else []

    return {
        "status": "success",
        "trackPath": str(track.path),
        "trackLength": track.lengthInBeats,
        "requiredLength": max_end,
        "startBeats": start,
        "layers": layers_out,
        "tags": tags,
        "splits": splits,
        "errors": errors,
    }

return run()
