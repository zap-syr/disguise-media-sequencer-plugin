import time
t0 = time.clock()
time.sleep(0.9)
return {"slept": 0.9, "measured": time.clock() - t0}
