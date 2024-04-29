

import cv2
import numpy as np

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

img = cv2.imread('public/assets/logo1.png', cv2.IMREAD_UNCHANGED)
img = image_resize(img, width=400)

imgcopy = img.copy()
img = cv2.cvtColor(img,cv2.COLOR_RGBA2BGR)
# print(img.shape)

mask = np.zeros(img.shape[:2],np.uint8)
maskWh = np.ones(img.shape[:2],np.uint8)*255

bgdModel = np.zeros((1,65),np.float64)
fgdModel = np.zeros((1,65),np.float64)
rect = (0,0, img.shape[1]-1, img.shape[0]-1)
cv2.grabCut(img,mask,rect,bgdModel,fgdModel,5,cv2.GC_INIT_WITH_RECT)

mask2 = np.where((mask==2)|(mask==0),1,0).astype('uint8')
img = img*mask2[:,:,np.newaxis]

# maskWh = cv2.subtract(maskWh, mask*255)
# mask2 = mask2[:,:,np.newaxis]
cv2.imshow('Output Contour ', img)
cv2.imshow('Original', imgcopy)
img = cv2.cvtColor(img,cv2.COLOR_RGBA2GRAY)
_, contours, hierarchy = cv2.findContours(img.copy(), cv2.RETR_TREE, cv2.CHAIN_APPROX_NONE)

out = np.zeros_like(img)
cv2.drawContours(out, contours, -1, 255, 3)
cv2.imshow('Output Contour', out)

cv2.waitKey(0)
cv2.destroyAllWindows()