import time
t0 = time.clock()
time.sleep(3)
return {"slept": 3, "measured": time.clock() - t0}
