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

class CorrectionCache():
    def __init__(self):
        self.stored = {}
    
    def put(self, key: str, value):
        if key in self.stored:
            if abs(value - self.stored[key]) <= 0.7 or abs(value - self.stored[key]) >= 20:
                return
            else:
                self.stored[key] = value
        else:
            self.stored[key] = value
    
    def get(self, key: str):
        return self.stored[key]

cache = CorrectionCache()

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
    result = recognizer.predict(gray)

    if result is not None:
        cache.put('ParamAngleX', result['head_pose'][0])
        cache.put('ParamAngleY', result['head_pose'][1])
        cache.put('ParamAngleZ', result['head_pose'][2])

        request_animation({
            'ParamAngleX': cache.get('ParamAngleX'),
            'ParamAngleY': cache.get('ParamAngleY'),
            'ParamAngleZ': cache.get('ParamAngleZ'),
            'ParamEyeLOpen': result['left_eye'],
            'ParamEyeROpen': result['right_eye'],
        })

        sio.emit('tracker', {
            'parts': result['parts_list'],
            'reproject': result['reproject_dst'],
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
