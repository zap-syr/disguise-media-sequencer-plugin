# Resolved alpha / audio per clip, the way the plugin should compute it:
#   - videos: trust VideoAsset.hasAlpha (verified: HAP -> False, NotchLC depth 32 -> True)
#   - stills: VideoAsset.hasAlpha is a default setting (JPEG and RGB PNG report True), so read the
#     source file header instead: clip.file.fragments[0].proxies[0] is the VideoFile whose path is
#     the file on disk relative to the project folder.
#   - audio: clip.hasAudio (verified: HAP with 2ch 48k -> True)
# NOTE: open() errors are NOT catchable in Designer's Python, so check os.path.exists first.
import os.path
import struct

def still_alpha(path, codec):
    kind = codec.split(":", 1)[1].upper() if ":" in codec else ""
    if kind in ("JPEG", "JPG"):
        return False, "jpeg has no alpha"
    if not os.path.exists(path):
        return None, "source file not found"
    fh = open(path, "rb")
    head = fh.read(64 * 1024)
    fh.close()
    if head[:8] == "\x89PNG\r\n\x1a\n":
        color_type = ord(head[25])
        if color_type in (4, 6):
            return True, "png colour type %d" % color_type
        # palette / RGB / grey: alpha only through a tRNS chunk (before the first IDAT)
        pos = 8
        while pos + 8 <= len(head):
            length = struct.unpack(">I", head[pos:pos + 4])[0]
            ctype = head[pos + 4:pos + 8]
            if ctype == "tRNS":
                return True, "png tRNS"
            if ctype in ("IDAT", "IEND"):
                break
            pos += 12 + length
        return False, "png colour type %d, no tRNS" % color_type
    if head[:4] == "\x76\x2f\x31\x01":
        # OpenEXR: channel list is in the header; an alpha channel is named "A" (or "*.A")
        i = head.find("channels\x00chlist\x00")
        if i >= 0:
            names, p = [], head.find("\x00", i + 16) + 1
            p = i + len("channels\x00chlist\x00") + 4
            while p < len(head) and head[p] != "\x00":
                end = head.find("\x00", p)
                names.append(head[p:end])
                p = end + 1 + 16
            return any(n == "A" or n.endswith(".A") for n in names), "exr channels " + ",".join(names)
        return None, "exr without chlist"
    return None, "unsupported still format " + kind

def run():
    rows = []
    for c in resourceManager.allResources(VideoClip):
        f = c.file
        if not f:
            continue
        codec = str(f.codec)
        is_still = codec.startswith("still_image:")
        src = None
        try:
            src = str(f.fragments[0].proxies[0].path)
        except Exception:
            pass
        if c.isVideoIn:
            alpha, why = None, "live input"
        elif is_still:
            alpha, why = still_alpha(src, codec) if src else (None, "no source path")
        else:
            alpha, why = bool(f.hasAlpha), "VideoAsset.hasAlpha"
        rows.append({
            "clip": str(c.path), "codec": codec, "source": src,
            "designerHasAlpha": bool(f.hasAlpha), "alpha": alpha, "alphaReason": why,
            "hasAudio": bool(c.hasAudio), "bitDepth": f.bitDepth,
        })
    return rows
return run()
