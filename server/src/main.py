from flask import Flask, request, jsonify
from flask_socketio import SocketIO
import face_recognition as fr
import cv2
import base64
import numpy as np

app = Flask(__name__)
sio = SocketIO(app)

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
    
    parts_list = fr.face_landmarks(gray)
    if len(parts_list) > 0:
        sio.emit('parts', parts_list[0], json=True)

@app.route('/params')
def get_params():
    sio.emit('animate-by-params', request.args, json=True)
    
    return jsonify(request.args)

@app.route('/params')
def post_params(methods=['POST']):
    sio.emit('animate-by-params', jsonify(request.data), room=sio_id)
    
    return jsonify(request.data)

if __name__ == '__main__':
    print('...listening on localhost:3000...')
    sio.run(app, host='0.0.0.0', port=3000)
