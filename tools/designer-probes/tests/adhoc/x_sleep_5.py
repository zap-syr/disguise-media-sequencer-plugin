import time
t0 = time.clock()
time.sleep(5)
return {"slept": 5, "measured": time.clock() - t0}
