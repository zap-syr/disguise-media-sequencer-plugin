def run():
    m = resourceManager.allResources(Projection)[0]
    names = [a for a in dir(m) if not a.startswith('_')]
    kinds = {}
    for a in names:
        try:
            ca = type(m).__dict__.get(a)
            k = type(ca).__name__ if ca is not None else 'inherited'
        except Exception as e:
            k = 'ERR'
        kinds[a] = k
    return {"type": type(m).__name__, "n": len(names), "kinds": kinds}
return run()
