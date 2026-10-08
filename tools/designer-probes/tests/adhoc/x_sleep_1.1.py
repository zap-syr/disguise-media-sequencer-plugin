import time
t0 = time.clock()
time.sleep(1.1)
return {"slept": 1.1, "measured": time.clock() - t0}
