import time
t0 = time.clock()
time.sleep(0.25)
return {"slept": 0.25, "measured": time.clock() - t0}
