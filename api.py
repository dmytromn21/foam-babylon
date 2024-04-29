from fastapi import FastAPI
from pydantic import BaseModel
import cv2
import numpy as np
import io
from fastapi.middleware.cors import CORSMiddleware
from fastapi import Form, Request
from fastapi.encoders import jsonable_encoder
from fastapi.responses import JSONResponse
from rembg import remove

import base64, binascii
import json 

app = FastAPI()

origins = [
    "http://localhost:3000"
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Define a route to handle POST requests
@app.post("/contour")
async def find_contour( request: Request):
    data = await request.body()
    data = json.loads(data)
    data = data["image"]
    image = base64.b64decode(data, validate=True)
    np_data = np.fromstring(image, np.uint8)

    img = cv2.imdecode(np_data,cv2.IMREAD_UNCHANGED)

    contours = get_contour(img)
    data = {}
    c = 0
    for contour in contours:
        # contour = contour[0]
        cname = str(c)
        data[cname] = []
        c += 1
        for points in contour:
            points = points[0]
            t = {}
            t['x'] = str(points[0])
            t['y'] = str(points[1])
            data[cname].append(t)
    return JSONResponse(content=jsonable_encoder(data))




def get_contour(img):
    # img = image_resize(img, width=400)
    (ht, wt) = img.shape[:2]
    imgcopy = img.copy()
    img = cv2.cvtColor(img,cv2.COLOR_RGBA2BGR)
    img_orig = np.copy(img)
    output = remove(img,alpha_matting=True, alpha_matting_foreground_threshold=270,alpha_matting_background_threshold=20, alpha_matting_erode_size=11,post_process_mask=True)
    gray_image = cv2.cvtColor(output, cv2.COLOR_BGR2GRAY)
    _,mask = cv2.threshold(gray_image, 1, 255, cv2.THRESH_BINARY)
    segmented_image = np.zeros_like(img_orig)
    kernel = cv2.getStructuringElement(cv2.MORPH_RECT, (3, 3))
    mask=cv2.morphologyEx(mask, cv2.MORPH_CLOSE, kernel,iterations=3)
    contours = cv2.findContours(mask, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
    contours = contours[0] if len(contours) == 2 else contours[1]
    big_contour = max(contours, key=cv2.contourArea)
    return [big_contour]
