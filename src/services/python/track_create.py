# createTrack(): load or create the track objects/track/<name>.apx.
# __ARGS__ = {"name": str}. The name arrives as JSON (never inside the Python source) and is
# checked again here, so it cannot leave objects/track (no "/", "\" or "..").
import json

ARGS = json.loads(__ARGS__)


def run():
    name = ARGS["name"].strip()
    if not name or "/" in name or "\\" in name or ".." in name:
        raise ValueError("Invalid track name")
    path = ("objects/track/" + name + ".apx").encode("utf-8")
    # Returned as a resource ({path, uid}), the same shape getTrackList() reads
    return resourceManager.loadOrCreate(path, Track)

return run()
