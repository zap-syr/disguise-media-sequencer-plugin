def run():
    t = resourceManager.load("objects/track/zz_probe_test.apx", Track)
    ls = sorted(t.layers, key=lambda l: (l.tStart, l.name))
    buckets = {}
    for l in ls:
        k = "start>=560" if l.tStart >= 560 else ("crosses 560" if l.tEnd >= 560 - 1e-6 and l.tStart < 560 else "inside")
        buckets[k] = buckets.get(k, 0) + 1
    sample = [{"name": l.name, "tStart": l.tStart, "tLength": l.tLength, "tEnd": l.tEnd} for l in ls if l.tStart >= 550][:8]
    return {"buckets": buckets, "sample": sample}
return run()
