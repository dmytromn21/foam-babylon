import cv2
import numpy as np

cropping = False

x_start, y_start, x_end, y_end = 0, 0, 0, 0

image = cv2.imread('public/assets/bunny.png')
oriImage = image.copy()

def image_resize(image, width = None, height = None, inter = cv2.INTER_AREA):
    dim = None
    (h, w) = image.shape[:2]
    if width is None and height is None:
        return image
    if width is None:
        r = height / float(h)
        dim = (int(w * r), height)
    else:
        r = width / float(w)
        dim = (width, int(h * r))
    resized = cv2.resize(image, dim, interpolation = inter)
    return resized


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


def mouse_crop(event, x, y, flags, param):
    # grab references to the global variables
    global x_start, y_start, x_end, y_end, cropping

    # if the left mouse button was DOWN, start RECORDING
    # (x, y) coordinates and indicate that cropping is being
    if event == cv2.EVENT_LBUTTONDOWN:
        x_start, y_start, x_end, y_end = x, y, x, y
        cropping = True

    # Mouse is Moving
    elif event == cv2.EVENT_MOUSEMOVE:
        if cropping == True:
            x_end, y_end = x, y

    # if the left mouse button was released
    elif event == cv2.EVENT_LBUTTONUP:
        # record the ending (x, y) coordinates
        x_end, y_end = x, y
        cropping = False # cropping is finished

        refPoint = [(x_start, y_start), (x_end, y_end)]

        if len(refPoint) == 2: #when two points were found
            roi = oriImage[refPoint[0][1]:refPoint[1][1], refPoint[0][0]:refPoint[1][0]]
            cv2.imshow("Cropped", roi)
            grabCut(roi)

cv2.namedWindow("image")
cv2.setMouseCallback("image", mouse_crop)

while True:

    i = image.copy()

    if not cropping:
        cv2.imshow("image", image)

    elif cropping:
        cv2.rectangle(i, (x_start, y_start), (x_end, y_end), (255, 0, 0), 2)
        cv2.imshow("image", i)
        # grabCut(i)

    cv2.waitKey(1)

# close all open windows
cv2.destroyAllWindows()

# import cv2
# import numpy as np


# cv2.imshow('Original', imgcopy)
# cv2.waitKey(0)
# cv2.destroyAllWindows()