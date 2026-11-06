# getStillAlpha(): alpha of still images, read from each source file header, in chunks.
# Imported by disguiseService.js (?raw); media_details.py marks the stills that need it.
# __ARGS__ = {"items": [{"clip": str, "source": str, "codec": str}]}
# Returns {"alpha": {clip: true|false|null}, "done": n}: the first n items were handled.
# A time budget keeps every call far from the ~1 s execute timeout on slow storage; the
# caller sends the rest again. At least one item is handled per call, so the caller always
# makes progress.
# Rules (VideoAsset.hasAlpha is wrong for stills, see 09_alpha_resolved.py):
# PNG colour type 4/6 or a tRNS chunk, EXR channel "A"; anything unreadable gives null.
import __builtin__
import json
import os.path
import struct
import time

ARGS = json.loads(__ARGS__)
BUDGET_S = 0.5
HEAD_BYTES = 64 * 1024


def read_head(path):
    fh = open(path, "rb")
    try:
        return fh.read(HEAD_BYTES)
    finally:
        fh.close()


def png_alpha(head):
    if len(head) < 26:
        return None
    if ord(head[25]) in (4, 6):
        return True
    pos = 8
    for _ in range(1000):
        if pos + 8 > len(head):
            break
        length = struct.unpack(">I", head[pos:pos + 4])[0]
        ctype = head[pos + 4:pos + 8]
        if ctype == "tRNS":
            return True
        if ctype in ("IDAT", "IEND"):
            break
        pos += 12 + length
    return False


def exr_alpha(head):
    marker = "channels\x00chlist\x00"
    i = head.find(marker)
    if i < 0:
        return None
    p = i + len(marker) + 4
    names = []
    for _ in range(1000):
        if p >= len(head) or head[p] == "\x00":
            break
        end = head.find("\x00", p)
        if end < 0:
            break
        names.append(head[p:end])
        p = end + 1 + 16
    return any(n == "A" or n.endswith(".A") for n in names)


def still_alpha(path, codec):
    kind = codec.split(":", 1)[1].upper() if ":" in codec else ""
    if kind in ("JPEG", "JPG"):
        return False
    if not path or not os.path.exists(path):
        return None
    try:
        head = read_head(path)
    except __builtin__.Exception:  # `Exception` is d3.Exception here and catches nothing
        return None
    if head[:8] == "\x89PNG\r\n\x1a\n":
        return png_alpha(head)
    if head[:4] == "\x76\x2f\x31\x01":
        return exr_alpha(head)
    return None


def run():
    items = ARGS["items"]
    started = time.time()
    alpha = {}
    done = 0
    for item in items[:200]:
        if done and time.time() - started > BUDGET_S:
            break
        source = item.get("source")
        alpha[item["clip"]] = still_alpha(source.encode("utf-8") if source else None, item.get("codec") or "")
        done += 1
    return {"alpha": alpha, "done": done}

return run()
