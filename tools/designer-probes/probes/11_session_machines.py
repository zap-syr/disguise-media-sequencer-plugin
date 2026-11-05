# Read-only. Every machine of the d3net session as the plugin's "Run on" list needs it
# (docs/PLAN-execution-target.md, P1). Run on the director. Editors have role 5 (MobileEditor).
def run():
    n = d3NetManager
    return [{"name": m.name, "hostname": m.hostname, "ip": m.IP_address,
             "role": int(m.role), "isDirector": n.director == m,
             "isLocal": n.localMachine == m} for m in n.machines]
return run()
