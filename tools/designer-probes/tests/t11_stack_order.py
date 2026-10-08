# WRITE TEST. Where does addNewLayer put a new layer in the stack? Does moveLayerToIndex work?
def run():
    track = resourceManager.load("objects/track/zz_probe_test.apx", Track)
    for l in list(track.layers):
        track.removeLayer(l)

    def order():
        return [{"i": track.findLayerIndex(l), "name": l.name, "tStart": l.tStart} for l in track.layers]

    steps = {}
    a = track.addNewLayer(VariableVideoModule, 0.0, 10.0, "A (1st, t=0)")
    b = track.addNewLayer(VariableVideoModule, 0.0, 10.0, "B (2nd, t=0)")
    c = track.addNewLayer(VariableVideoModule, 0.0, 10.0, "C (3rd, t=0)")
    steps["after A,B,C at same beat"] = order()
    d = track.addNewLayer(VariableVideoModule, 20.0, 10.0, "D (4th, t=20)")
    e = track.addNewLayer(VariableVideoModule, 5.0, 10.0, "E (5th, t=5)")
    steps["after D at t=20 and E at t=5"] = order()
    track.moveLayerToIndex(c, 0)
    steps["after moveLayerToIndex(C, 0)"] = order()
    track.moveLayerToIndex(c, len(track.layers) - 1)
    steps["after moveLayerToIndex(C, last)"] = order()
    return steps
return run()
