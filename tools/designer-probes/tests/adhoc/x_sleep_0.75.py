import time
t0 = time.clock()
time.sleep(0.75)
return {"slept": 0.75, "measured": time.clock() - t0}
