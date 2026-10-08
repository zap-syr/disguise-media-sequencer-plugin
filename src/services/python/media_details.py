# getMediaDetails(): per-clip metadata for the UI, keyed by VideoClip path.
# Imported by disguiseService.js (?raw) and runnable as a probe:
#   node tools/designer-probes/run.mjs src/services/python/media_details
# Verified against the media files on disk with tools/designer-probes/verify_media.mjs.
# Alpha: videos use VideoAsset.hasAlpha; stills read their own file header, because
# VideoAsset.hasAlpha is a default setting that is wrong for stills (see 09_alpha_resolved.py).
import os.path
import struct

def still_alpha(path, codec):
    kind = codec.split(":", 1)[1].upper() if ":" in codec else ""
    if kind in ("JPEG", "JPG"):
        return False
    if not path or not os.path.exists(path):
        return None
    fh = open(path, "rb")
    head = fh.read(64 * 1024)
    fh.close()
    if head[:8] == "\x89PNG\r\n\x1a\n":
        if ord(head[25]) in (4, 6):
            return True
        pos = 8
        while pos + 8 <= len(head):
            length = struct.unpack(">I", head[pos:pos + 4])[0]
            ctype = head[pos + 4:pos + 8]
            if ctype == "tRNS":
                return True
            if ctype in ("IDAT", "IEND"):
                break
            pos += 12 + length
        return False
    if head[:4] == "\x76\x2f\x31\x01":
        i = head.find("channels\x00chlist\x00")
        if i < 0:
            return None
        p = i + len("channels\x00chlist\x00") + 4
        names = []
        while p < len(head) and head[p] != "\x00":
            end = head.find("\x00", p)
            names.append(head[p:end])
            p = end + 1 + 16
        return any(n == "A" or n.endswith(".A") for n in names)
    return None

def run():
    out = {}
    for c in resourceManager.allResources(VideoClip):
        f = c.file
        path = str(c.path)
        if not f:
            out[path] = {"kind": "missing"}
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
        except Exception:
            pass
        if live:
            alpha = None
        elif still:
            alpha = still_alpha(src, codec)
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
            "hasAudio": bool(c.hasAudio),
            "bitDepth": f.bitDepth,
            "source": src,
        }
    return out
return run()
