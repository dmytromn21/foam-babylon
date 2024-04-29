import numpy as np 
import json 

contours = np.array([[[0, 1], [1, 3]], [[2, 4], [5, 8], [2, 5]]])
data = {}
json_data = json.dumps(data)
# print(json_data)
c = 0
for contour in contours:
    cname = str(c)
    data[cname] = []
    c += 1
    for points in contour:
        t = {}
        t['x'] = points[0]
        t['y'] = points[1]
        data[cname].append(t)
        

print(data)