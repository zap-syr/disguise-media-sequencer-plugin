# Q-D: collect the candidate metadata for ALL clips and measure how long it takes.
# Candidate fields are guesses; probe 04 shows which ones really exist.
import time

def run():
    t0 = time.time()
    rows = []
    errors = {}
    for c in resourceManager.allResources(VideoClip):
        r = {"path": str(c.path)}
        for key, fn in (
            ("isVideoIn", lambda: bool(c.isVideoIn)),
            ("nFrames",   lambda: c.file.nFrames),
            ("fileFps",   lambda: c.fileFps),
            ("res",       lambda: str(c.file.resolution)),
        ):
            try:
                r[key] = fn()
            except Exception as e:
                errors[key] = str(e)[:120]
        rows.append(r)
    elapsed_ms = (time.time() - t0) * 1000.0
    return {
        "count": len(rows),
        "elapsedMs": elapsed_ms,
        "msPerClip": elapsed_ms / len(rows) if rows else 0,
        "errors": errors,
        "sample": rows[:15],
    }
return run()
