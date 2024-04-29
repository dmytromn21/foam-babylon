import cv2
import numpy as np
import io

# img = histEqui(img)
img = cv2.imread("public/assets/geeksforgeeks.png", cv2.IMREAD_COLOR)
# img = cv.drawContours(img, contours, -1, (0,255,0), 3)

laplacian = np.array([[-1,-1,-1], [-1,9,-1], [-1,-1,-1]])
imgLap = cv2.filter2D(img.copy(), -1, laplacian)
contours = grabCut(img)
contours += grabCut(imgLap)
cv2.drawContours(img, contours, -1, (0,255,0), 3)
cv2.imwrite("res.png", img)



def histEqui(img):
    contrast = 1.2
    bright = 1
    image2 = cv2.addWeighted(img, contrast, np.zeros(img.shape, img.dtype), 0, bright)
    return image2

def grabCut(img):
    # img = image_resize(img, width=400)
    (ht, wt) = img.shape[:2]
    imgcopy = img.copy()
    # cv2.imwrite("after.png", img)
    img = cv2.cvtColor(img,cv2.COLOR_RGBA2BGR)
    mask = np.zeros(img.shape[:2],np.uint8)
    rect = (0,0, img.shape[1]-1, img.shape[0]-1)
    first = True 
    iterations = 20
    while(iterations>0):
        print(iterations)
        bgdmodel = np.zeros((1, 65), np.float64)
        fgdmodel = np.zeros((1, 65), np.float64)
        if(first):
            cv2.grabCut(img, mask, rect, bgdmodel, fgdmodel, 1, cv2.GC_INIT_WITH_RECT)
            first = False
        else:
            cv2.grabCut(img, mask, rect, bgdmodel, fgdmodel, 1, cv2.GC_INIT_WITH_MASK)
        iterations-=1
    mask[mask == 1] = 255
    mask[mask == 3] = 255
    mask[mask == 0] = 0
    mask[mask == 2] = 0

    kernel = np.ones((9, 9), np.uint8)
    mask = cv2.erode(mask, kernel) 
    mask = cv2.dilate(mask, kernel, iterations=1)
    # cv2.imwrite("mask.png", mask)

    contours, hierarchy = cv2.findContours(mask.copy(), cv2.RETR_TREE, cv2.CHAIN_APPROX_NONE)

    filtered_contours = []
    tot_area = ht * wt
    ignore_pixels = 30
    #ignore contours with area very close to the image dimension
    #ignore contours with area less than 1/10th of the dimenstion(area) of the image
    filtered_contours = [c for c in contours if (cv2.contourArea(c) > tot_area/10) and (cv2.contourArea(c) < tot_area - ignore_pixels)]
    if(len(filtered_contours)>0):
        return filtered_contours

    return contours
    # out = np.zeros_like(img)
    # cv2.drawContours(out, contours, -1, 255, 3)
    # cv2.imshow('Cut Contour', out)
