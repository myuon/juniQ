#!/usr/bin/env python

from flask import Flask, request, jsonify
from flask_cors import CORS
from flask_socketio import SocketIO
import face_recognition as fr
import cv2
import base64
import numpy as np
import requests

app = Flask(__name__)
CORS(app)
sio = SocketIO(app)

class CorrectionCache():
    def __init__(self, threshold = 0.5):
        self.threshold = threshold
        self.stored = {}
    
    def put(self, key: str, value):
        if key in self.stored:
            if abs(value - self.stored[key]) / abs(self.stored[key]) <= self.threshold:
                self.stored[key] = value
            else:
                return
        else:
            self.stored[key] = value
    
    def get(self, key: str):
        return self.stored[key]

cache = CorrectionCache(threshold = 0.2)

@app.route('/')
def index():
    return "/"

@sio.on('connect')
def connect():
    print('socket connect!')

def head_pose(size, parts):
    image_points = np.array([
        parts['nose_tip'][2],       # nose tip center
        parts['chin'][8],           # chin center
        parts['left_eye'][0],       # left eye left corner
        parts['right_eye'][3],      # right eye right corner
        parts['top_lip'][0],        # left mouth corner
        parts['top_lip'][6]         # right mouth corner
    ], dtype="double")

    model_points = np.array([
        (0.0, 0.0, 0.0),
        (0.0, -330.0, -65.0),
        (-225.0, 170.0, -135.0),
        (225.0, 170.0, -135.0),
        (-150.0, -150.0, -125.0),
        (150.0, 150.0, -125.0)
    ])

    # get rotation vector by solvePnP
    focal_length = size[1]
    center = (size[1] / 2.0, size[0] / 2.0)
    camera_matrix = np.array([
        [focal_length, 0, center[0]],
        [0, focal_length, center[1]],
        [0, 0, 1]
    ], dtype = "double")
    dist_coeffs = np.zeros((4,1))
    (success, rotation_vector, translation_vector) = cv2.solvePnP(model_points, image_points, camera_matrix, dist_coeffs, flags=cv2.SOLVEPNP_ITERATIVE)

    # get (X,Y,Z) angles of *camera*
    (rmat,_) = cv2.Rodrigues(rotation_vector)

    pitch = -np.arcsin(rmat[2][0])
    roll = np.arctan2(rmat[2][1] / np.cos(pitch), rmat[2][2] / np.cos(pitch))
    yaw = np.arctan2(rmat[1][0] / np.cos(pitch), rmat[0][0] / np.cos(pitch))

    # get (yaw, roll, pitch)
    angles = np.array([yaw, roll, pitch])

    # radian -> degree
    angles = angles * 180.0 / np.pi

    # calibration
    angles = np.array([
        angles[0] + 160,
        angles[1] - 160,
        angles[2] + 30,
    ])

    return angles

def bounding_box(iterable):
    min_x, min_y = np.min(iterable, axis=0)
    max_x, max_y = np.max(iterable, axis=0)
    return np.array([(min_x, min_y), (max_x, min_y), (max_x, max_y), (min_x, max_y)])

def size(rect):
    return (rect[1][0] - rect[0][0], rect[3][1] - rect[1][1])

def left_eye_opener(parts):
    EYE_HEIGHT = 8.0
    return size(bounding_box(parts['left_eye']))[1] / EYE_HEIGHT

def right_eye_opener(parts):
    EYE_HEIGHT = 8.0
    return size(bounding_box(parts['right_eye']))[1] / EYE_HEIGHT

@sio.on('img')
def recieve_image(encoded):
    buffer = base64.b64decode(encoded.split(',')[1])
    img = cv2.imdecode(np.fromstring(buffer, np.uint8), cv2.IMREAD_COLOR)
    gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)

    parts_list = fr.face_landmarks(gray)
    if len(parts_list) > 0:
        # head pose estimation
        """
        angles = head_pose(img.shape, parts_list[0])
        cache.put('ParamAngleX', angles[0])
        cache.put('ParamAngleY', angles[1])
        cache.put('ParamAngleZ', angles[2])

        request_animation({
            'ParamAngleX': cache.get('ParamAngleX'),
            'ParamAngleY': cache.get('ParamAngleY'),
            'ParamAngleZ': cache.get('ParamAngleZ')
        })
        """

        # eye open estimation
        _ParamEyeLOpen = left_eye_opener(parts_list[0])
        _ParamEyeROpen = right_eye_opener(parts_list[0])

        request_animation({
            'ParamEyeLOpen': _ParamEyeLOpen,
            'ParamEyeROpen': _ParamEyeROpen,
        })

        sio.emit('tracker', { 'parts': parts_list[0], 'angles': [] }, json=True)

@app.route('/params')
def get_params():
    request_animation(request.args)
    return jsonify(request.args)

@app.route('/params')
def post_params(methods=['POST']):
    request_animation(request.data)
    return jsonify(request.data)

def request_animation(json):
    sio.emit('animate-by-params', json, json=True)

if __name__ == '__main__':
    print('...listening on localhost:3000...')
    sio.run(app, host='0.0.0.0', port=3000)
