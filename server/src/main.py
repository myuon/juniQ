#!/usr/bin/env python

from flask import Flask, request, jsonify, send_from_directory
from flask_cors import CORS
from flask_socketio import SocketIO
import cv2
import base64
import numpy as np
import time
import eventlet
eventlet.monkey_patch()

import recognizer

app = Flask(__name__, static_url_path='')
CORS(app)
sio = SocketIO(app)

class KalmanCache():
    def __init__(self, keys=[]):
        self.filters = {}
        self.prevs = {}
        self.vels = {}

        for key in keys:
            self.create(key)

    @staticmethod
    def newKalmanFilter():
        kalman = cv2.KalmanFilter(3,3)
        kalman.measurementMatrix = np.array([
            [1,1,1],
            [0,0,0],
            [0,0,0]
        ], np.float32)
        kalman.transitionMatrix = np.array([
            [1,0.1,0],
            [0,1,0.5],
            [0,0,1]
        ], np.float32)
        kalman.processNoiseCov = np.array([
            [1,0,0],
            [0,1,0],
            [0,0,1]
        ], np.float32) * 0.1

        return kalman

    def create(self, key):
        self.filters[key] = self.newKalmanFilter()
        self.prevs[key] = 0.0
        self.vels[key] = 0.0

    def correct(self, key, value):
        vel = value - self.prevs[key]
        self.filters[key].correct(np.array([
            value,
            vel,
            vel - self.vels[key]
        ], np.float32))

        self.prevs[key] = value
        self.vels[key] = vel

    def predict(self, key):
        return float(self.filters[key].predict()[0])

cache = KalmanCache([
    'ParamAngleX',
    'ParamAngleY',
    'ParamAngleZ',
    'ParamEyeLOpen',
    'ParamEyeROpen',
    'ParamMouthOpenY',
    'ParamEyeBallX',
    'ParamEyeBallY',
    'ParamBodyAngleZ',
    'ParamMouthOpenY',
])

@app.route('/')
def index():
    return "/"

@sio.on('connect')
def connect():
    print('socket connect!')

@sio.on('disconnect')
def disconnect():
    print('socket disconnect!')

@app.route('/params')
def get_params():
    request_animation(request.args)
    return jsonify(request.args)

@app.route('/params')
def post_params(methods=['POST']):
    request_animation(request.data)
    return jsonify(request.data)

@app.route('/viewer/<path:path>')
def viewer(path):
    return send_from_directory('/viewer', path)

prev_frame = None

@sio.on('img')
def recieve_image(encoded):
    global prev_frame
    buffer = base64.b64decode(encoded.split(',')[1])
    prev_frame = cv2.imdecode(np.frombuffer(buffer, np.uint8), cv2.IMREAD_COLOR)
    prev_frame = cv2.cvtColor(prev_frame, cv2.COLOR_BGR2GRAY)

def request_animation(json):
    sio.emit('animate-by-params', json, json=True)

def face_detect():
    global prev_frame
    if prev_frame is None: return

    resize = (0.9,0.9)
    gray = cv2.resize(prev_frame, None, fx=resize[0], fy=resize[1])
    result = recognizer.predict(gray, prev_frame, resize)

    if result is not None:
        cache.correct('ParamAngleX', -result['head_pose'][0] / 2)
        cache.correct('ParamAngleY', -result['head_pose'][1])
        cache.correct('ParamAngleZ', -result['head_pose'][2])
        cache.correct('ParamEyeLOpen', result['left_eye'])
        cache.correct('ParamEyeROpen', result['right_eye'])
        cache.correct('ParamMouthOpenY', result['mouse'])
        cache.correct('ParamBodyAngleZ', -result['body_pose'] / 3)

        if result['eye_center'][1] is not None:
            cache.correct('ParamEyeBallX', -result['eye_center'][1][0])
            cache.correct('ParamEyeBallY', -result['eye_center'][1][1])

        request_animation({
            'ParamAngleX': cache.predict('ParamAngleX'),
            'ParamAngleY': cache.predict('ParamAngleY'),
            'ParamAngleZ': cache.predict('ParamAngleZ'),
            'ParamEyeLOpen': cache.predict('ParamEyeLOpen'),
            'ParamEyeROpen': cache.predict('ParamEyeROpen'),
            'ParamEyeBallX': cache.predict('ParamEyeBallX'),
            'ParamEyeBallY': cache.predict('ParamEyeBallY'),
            'ParamMouthOpenY': cache.predict('ParamMouthOpenY'),
            'ParamBodyAngleZ': cache.predict('ParamBodyAngleZ'),
        })

        sio.emit('tracker', {
            'parts': result['parts_list'],
            'reproject': result['reproject_dst'],
            'eye_center': result['eye_center'][0],
            'contour': {} #result['contour'],
        }, json=True)

def face_detect_loop():
    while True:
        start = time.time()
        face_detect()
        detection_time = time.time() - start

        eventlet.sleep(0.017 - detection_time)

if __name__ == '__main__':
    print('...listening on localhost:3000...')
    eventlet.spawn(face_detect_loop)
    sio.run(app, host='0.0.0.0', port=3000)


