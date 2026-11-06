# getMediaDetails(): per-clip metadata for the UI, keyed by VideoClip path.
# Imported by disguiseService.js (?raw) and runnable as a probe:
#   node tools/designer-probes/run.mjs src/services/python/media_details
# Verified against the media files on disk with tools/designer-probes/verify_media.mjs.
# Alpha: videos use VideoAsset.hasAlpha. VideoAsset.hasAlpha is a default setting that is
# wrong for stills (see 09_alpha_resolved.py): JPEG has none, other stills get
# alphaPending and still_alpha.py reads their file header in separate calls, so many stills
# on slow storage cannot push this call past the execute timeout.
# missing: the clip is in error (its media was deleted or cannot be loaded), see 10_missing_media.py.
import __builtin__

def is_jpeg(codec):
    return codec.split(":", 1)[1].upper() in ("JPEG", "JPG") if ":" in codec else False

def run():
    out = {}
    for c in resourceManager.allResources(VideoClip):
        f = c.file
        path = str(c.path)
        if not f:
            out[path] = {"kind": "missing", "missing": True}
            continue
        codec = str(f.codec)
        live = bool(c.isVideoIn)
        n = c.fileNFrames
        fps = c.fileFps
        still = codec.startswith("still_image:") or (not live and n <= 1)
        kind = "live" if live else ("still" if still else "video")
        src = None
        try:
            src = str(f.fragments[0].proxies[0].path)
        except __builtin__.Exception:  # `Exception` is d3.Exception here and catches nothing
            pass
        pending = False
        if live:
            alpha = None
        elif still:
            alpha = False if is_jpeg(codec) else None
            pending = alpha is None and bool(src) and not c.isInError
        else:
            alpha = bool(f.hasAlpha)
        size = c.fileFrameSize
        out[path] = {
            "kind": kind,
            "codec": codec,
            "nFrames": n,
            "fps": fps,
            "duration": (float(n) / fps) if (kind == "video" and fps > 0) else None,
            "transportDuration": str(c.transportDuration),
            "res": "%dx%d" % (int(size.x), int(size.y)),
            "hasAlpha": alpha,
            "alphaPending": pending,
            "hasAudio": bool(c.hasAudio),
            "bitDepth": f.bitDepth,
            "source": src,
            # A clip whose media was deleted stays in allResources with its old metadata;
            # Designer flags it "in error" (bad, incomplete or not found locally, 10_missing_media.py)
            "missing": bool(c.isInError),
        }
    return out
return run()
