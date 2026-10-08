import time
t0 = time.clock()
time.sleep(1.25)
return {"slept": 1.25, "measured": time.clock() - t0}
