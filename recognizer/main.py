import face_recognition
import cv2
import matplotlib.pyplot as plot
import matplotlib.patches as patches

video_capture = cv2.VideoCapture(0)
fib, ax = plot.subplots()

while True:
    ret, frame = video_capture.read()
    rgb_frame = frame[:,:,::-1]

    for face_landmarks in face_recognition.face_landmarks(rgb_frame):
        print("The {} in this face has the following points: {}".format(facial_feature, face_landmarks[facial_feature]))

    cv2.imshow('VideoCapture, frame')

    ax.imshow(frame)
    plot.pause(0.1)
    plot.cla()

    if cv2.watKey(1) & 0xFF == ord('q'): break

video_capture.release()
cv2.destroyAllWindows()

