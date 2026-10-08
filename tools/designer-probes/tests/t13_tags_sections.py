# WRITE TEST. Tag types/texts, several tags at one beat, overwriting a tag of the same type,
# and section splits (including splitting twice at the same beat).
def run():
    track = resourceManager.load("objects/track/zz_probe_test.apx", Track)
    track.removeTags(0.0, track.lengthInBeats + 1.0)

    def tags_at(b):
        return [{"type": t.type, "text": t.text} for t in track.tagsAtBeat(b)]

    def sections():
        return [{"i": i, "beat": track.sectionToBeat(i), "lenBeats": track.sectionLengthBeats(i)}
                for i in range(track.nSections())]

    out = {"sectionsBefore": sections()}

    track.setTagAtBeat(5.0, Tag(0, "01:00:00:00"))
    track.setTagAtBeat(5.0, Tag(1, "1.1"))
    track.setTagAtBeat(5.0, Tag(2, "1.60"))
    out["tagsAt5_after3types"] = tags_at(5.0)

    track.setTagAtBeat(5.0, Tag(1, "1.2"))
    out["tagsAt5_afterSecondCue"] = tags_at(5.0)

    track.setTagAtBeat(7.0, Tag(1, "2"))
    track.setTagAtBeat(8.0, Tag(1, "3.4.5"))
    out["tagAtBeat(7, cue)"] = track.tagAtBeat(7.0, 1).text if track.tagAtBeat(7.0, 1) else None
    out["tagsAt8"] = tags_at(8.0)
    out["findBeatOfNextTag(0)"] = track.findBeatOfNextTag(0.0)
    out["findBeatOfNextTag(5)"] = track.findBeatOfNextTag(5.0)

    track.splitSectionAtBeat(10.0)
    track.splitSectionAtBeat(10.0)
    track.splitSectionAtBeat(25.0)
    out["sectionsAfterSplits(10,10,25)"] = sections()
    out["sectionAtBeat(10)"] = track.sectionAtBeat(10.0)
    out["sectionAtBeat(11)"] = track.sectionAtBeat(11.0)
    return out
return run()
