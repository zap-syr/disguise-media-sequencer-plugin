# getSessionMachines(): every machine of the d3net session, for the "Run on" list
# (docs/PLAN-execution-target.md). Run on the DIRECTOR: only it reports a usable address for
# the others (each machine reports its own IP as 127.0.0.1). Editors have role 5 (MobileEditor).
# Runnable as a probe: node tools/designer-probes/run.mjs src/services/python/session_machines
def run():
    n = d3NetManager
    return [{"name": m.name, "hostname": m.hostname, "ip": m.IP_address,
             "role": int(m.role), "isDirector": n.director == m} for m in n.machines]
return run()
