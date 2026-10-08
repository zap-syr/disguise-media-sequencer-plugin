import time
t0 = time.clock()
time.sleep(10)
return {"slept": 10, "measured": time.clock() - t0}
