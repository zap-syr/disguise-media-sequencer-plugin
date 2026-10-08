import time
t0 = time.clock()
time.sleep(0.5)
return {"slept": 0.5, "measured": time.clock() - t0}
