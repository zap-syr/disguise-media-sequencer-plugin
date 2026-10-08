# What the frontend receives today: getMediaList / getMappingList / getTrackList return
# resources directly and rely on Designer's default JSON serialisation. Return one of each.
def run():
    def first(t):
        items = resourceManager.allResources(t)
        return items[0] if items else None
    return {
        "VideoClip": first(VideoClip),
        "Projection": first(Projection),
        "Track": first(Track),
    }
return run()
