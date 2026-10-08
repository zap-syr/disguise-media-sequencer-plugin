# WRITE TEST. Deletes the scratch track created by the write tests (and its file).
def run():
    track = resourceManager.load("objects/track/zz_probe_test.apx", Track)
    if not track:
        return {"deleted": False, "reason": "not found"}
    resourceManager.remove(track.path)
    return {"deleted": True}
return run()
