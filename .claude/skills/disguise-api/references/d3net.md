# D3Net (machines, director / understudy / actors)

Source: https://developer.disguise.one/python-api/guides/d3net/

`d3NetManager` (global, `D3NetManager`) represents the networked system of servers.
Director = primary show controller; understudies = hot backups; actors = render machines.

> This plugin talks to the **director** (`?director=` URL param). Changing roles from the
> plugin affects the whole session - always confirm with the user first.

## Machines and roles

| Task | Code |
|---|---|
| Manager | `d3net = d3NetManager` |
| All machines | `d3net.machines` → `List[Machine]` |
| This machine | `d3net.localMachine` |
| Director | `d3net.director` (settable: `d3net.director = machine`) |
| Understudies | `d3net.understudies` (settable list) |
| Actors | `d3net.actors` |
| Is director? | `d3net.director == machine` |
| Is understudy? | `d3net.isUnderstudy(machine)` |
| Role | `machine.role` (int enum) |
| Valid director? | `d3net.hasValidDirector` |
| Status | `d3net.machineStatus(machine.nodeId)` → `MachineStatus` |
| Find by hostname | `d3net.findMachineByHostname("myhost")` |

Machine display name: `machine.name` (and `machine.feed` = its `FeedScene`).

```python
def run():
    d3net = d3NetManager
    return [{
        "name": m.name,
        "role": m.role,
        "isDirector": d3net.director == m,
        "isUnderstudy": d3net.isUnderstudy(m),
        "isLocal": d3net.localMachine == m,
    } for m in d3net.machines]
return run()
```

## Modes

| Task | Code |
|---|---|
| Enable director mode on this machine | `d3net.directorMode = True` |
| Enable understudy mode on this machine | `d3net.understudy = True` |
| Dedicated director mode? | `d3net.dedicatedDirectorMode` |
| Non-dedicated director mode? | `d3net.nonDedicatedDirectorMode` |
| Solo mode? | `d3net.soloMode` |

## Commands and utilities

| Task | Code |
|---|---|
| Send `RemoteCommand` to all | `d3net.dispatchCommandAll(cmd, sessionOnly=False)` |
| Send to one host | `d3net.dispatchCommandDirect("hostname", cmd, sessionOnly=False)` |
| Send matrix (FeedScene) routing | `d3net.sendMatrixRouting(machine, feed)` |
| Understudy available for machine? | `d3net.understudyAvailableFor(machine)` |
| Understudy config status | `d3net.getUnderstudyConfigStatus(understudy_machine)` |
