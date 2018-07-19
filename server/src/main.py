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
    def __init__(self, replica=3):
        self.stored = {}
        self.replica = replica
    
    def put(self, key: str, value):
        if key in self.stored:
            if abs(value) != 0 and abs(value - self.stored[key][0]) / abs(value) < 0.10:
                return
            
            self.stored[key].append(value)

            if len(self.stored[key]) >= self.replica:
                self.stored[key].pop(0)
        else:
            self.stored[key] = [value]
    
    def get(self, key: str):
        values = self.stored[key]
        return sum(values) / len(values)

cache = CorrectionCache(replica=3)

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
        cache.put('ParamAngleX', -result['head_pose'][0] / 4)
        cache.put('ParamAngleY', -result['head_pose'][1])
        cache.put('ParamAngleZ', -result['head_pose'][2])
        cache.put('ParamEyeLOpen', result['left_eye'])
        cache.put('ParamEyeROpen', result['right_eye'])
        
        if result['eye_center'][1] is not None:
            cache.put('ParamEyeBallX', -result['eye_center'][1][0])
            cache.put('ParamEyeBallY', -result['eye_center'][1][1])

        request_animation({
            'ParamAngleX': cache.get('ParamAngleX'),
            'ParamAngleY': cache.get('ParamAngleY'),
            'ParamAngleZ': cache.get('ParamAngleZ'),
            'ParamEyeLOpen': cache.get('ParamEyeLOpen'),
            'ParamEyeROpen': cache.get('ParamEyeROpen'),
            'ParamEyeBallX': cache.get('ParamEyeBallX'),
            'ParamEyeBallY': cache.get('ParamEyeBallY'),
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
