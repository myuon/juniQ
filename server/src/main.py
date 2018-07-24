#!/usr/bin/env python

from flask import Flask, request, jsonify
from flask_cors import CORS
from flask_socketio import SocketIO
import cv2
import base64
import numpy as np

import recognizer

app = Flask(__name__)
CORS(app)
sio = SocketIO(app)

class KalmanCache():
    def __init__(self, keys=[]):
        self.filters = {}
        self.prevs = {}

        for key in keys:
            self.create(key)

    @staticmethod
    def newKalmanFilter():
        kalman = cv2.KalmanFilter(2,2)
        kalman.measurementMatrix = np.array([
            [1,1],
            [0,1],
        ], np.float32)
        kalman.transitionMatrix = np.array([
            [1,0.2],
            [0,1],
        ], np.float32)
        kalman.processNoiseCov = np.array([
            [1,0],
            [0,1],
        ], np.float32) * 0.1

        return kalman

    def create(self, key):
        self.filters[key] = self.newKalmanFilter()
        self.prevs[key] = 0.0

    def correct(self, key, value):
        self.filters[key].correct(np.array([
            value,
            value - self.prevs[key],
        ], np.float32))

        self.prevs[key] = value
    
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
])

@app.route('/')
def index():
    return "/"

@sio.on('connect')
def connect():
    print('socket connect!')

@sio.on('img')
def recieve_image(encoded):
    buffer = base64.b64decode(encoded.split(',')[1])
    img = cv2.imdecode(np.fromstring(buffer, np.uint8), cv2.IMREAD_COLOR)
    gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
    result = recognizer.predict(gray, img)

    if result is not None:
        cache.correct('ParamAngleX', -result['head_pose'][0] / 2)
        cache.correct('ParamAngleY', -result['head_pose'][1])
        cache.correct('ParamAngleZ', -result['head_pose'][2])
        cache.correct('ParamEyeLOpen', result['left_eye'])
        cache.correct('ParamEyeROpen', result['right_eye'])
        cache.correct('ParamMouthOpenY', result['mouse'])
        
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
        })

        sio.emit('tracker', {
            'parts': result['parts_list'],
            'reproject': result['reproject_dst'],
            'eye_center': result['eye_center'][0],
        }, json=True)

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
