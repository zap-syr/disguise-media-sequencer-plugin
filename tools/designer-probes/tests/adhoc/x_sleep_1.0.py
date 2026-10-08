import time
t0 = time.clock()
time.sleep(1.0)
return {"slept": 1.0, "measured": time.clock() - t0}
