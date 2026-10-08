# createLayerPlan step 3: place tags and section splits computed by plan_prepare.py.
# __ARGS__ = {"trackPath": str, "tags": [{"beat", "type", "text"}], "splits": [beat]}
# One tag per type per beat: a second tag of the same type at the same beat replaces the first.
import json

ARGS = json.loads(__ARGS__)


def s(value):
    return value.encode("utf-8") if isinstance(value, unicode) else value


def run():
    track = resourceManager.load(s(ARGS["trackPath"]), Track)
    if not track:
        return {"status": "error", "message": "Could not load target track"}
    for b in ARGS["splits"]:
        track.splitSectionAtBeat(b)
    for tag in ARGS["tags"]:
        track.setTagAtBeat(tag["beat"], Tag(tag["type"], s(tag["text"])))
    return {"status": "success", "tags": len(ARGS["tags"]), "splits": len(ARGS["splits"])}

return run()
