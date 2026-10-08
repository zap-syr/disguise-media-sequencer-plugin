import struct
def run():
    out = []
    for c in resourceManager.allResources(VideoClip):
        f = c.file
        if not f or not str(f.codec).startswith("still_image:"):
            continue
        r = {"clip": str(c.path), "codec": str(f.codec)}
        # VideoAsset path vs file on disk
        r["assetPath"] = str(f.path)
        candidates = [str(f.path).replace("\\", "/")]
        if candidates[0].endswith(".apx"):
            candidates.append(candidates[0][:-4])
        for p in candidates:
            try:
                fh = open(p, "rb")
                head = fh.read(33)
                fh.close()
                r["readFrom"] = p
                if head[:8] == "\x89PNG\r\n\x1a\n":
                    r["pngColorType"] = ord(head[25])
                r["firstBytes"] = head[:4].encode("hex")
                break
            except Exception as e:
                r["openErr:" + p] = str(e)[:100]
        out.append(r)
    return out
return run()
