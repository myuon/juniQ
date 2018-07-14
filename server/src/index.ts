import * as path from 'path';
import * as http from 'http';
import * as socketio from 'socket.io';
import * as express from 'express';
import { HexBase64BinaryEncoding } from 'crypto';
const cv = require('opencv4nodejs');
const fr = require('face-recognition').withCv(cv);

let app = express();
let server = new http.Server(app);
let io = socketio(server);
let socket_ = null;
let peerServer = require('peer').ExpressPeerServer(server, { debug: true });

app.use('/peerjs', peerServer);
peerServer.on('connection', (id) => {
  console.log(id);
  console.log("connect!");
})

app.get('/', (req, res) => {
  res.send('/');
});

app.get('/params', (req, res) => {
  if (socket_ !== null) {
    socket_.emit('animate-by-params', req.query);
  }

  res.send(req.query);
});

app.post('/params', (req, res) => {
  if (socket_ !== null) {
    socket_.emit('animate-by-params', req.body);
  }

  res.send(req.body);
});

export interface Point {
  x: number,
  y: number,
};

export interface FacialParts {
  face: Point[],
  eyeblow_right: Point[],
  eyeblow_left: Point[],
  eye_right: Point[],
  eye_left: Point[],
  nose_bridge: Point[],
  nasal_cavity: Point[],
  mouth_outer: Point[],
  mouth_inner: Point[]
};

function createFacialParts(arr: Point[]): FacialParts {
  return {
    face: arr.slice(0,17),
    eyeblow_right: arr.slice(17,22),
    eyeblow_left: arr.slice(22,27),
    nose_bridge: arr.slice(27,31),
    nasal_cavity: arr.slice(31,36),
    eye_right: arr.slice(36,42),
    eye_left: arr.slice(42,48),
    mouth_outer: arr.slice(48,60),
    mouth_inner: arr.slice(60,68),
  };
};

io.on('connection', (socket) => {
  socket_ = socket;
  console.log('websocket connect!');

  socket.on('img', (base64: HexBase64BinaryEncoding) => {
    let output = base64.replace(/^data:image\/(png|jpeg);base64,/, "");
    let buffer = Buffer.from(output, 'base64');
    let cvImg = fr.CvImage(cv.imdecode(buffer));
    let img = fr.cvImageToImageRGB(cvImg);

    const detector = new fr.FrontalFaceDetector();
    const predictor = fr.FaceLandmark68Predictor();
    const faceRects = detector.detect(img);

    if (faceRects.length > 0) {
      const shapes = predictor.predict(img, faceRects[0]);
      socket.emit('parts', createFacialParts(shapes.getParts().map(p => { return { x: p.x, y: p.y }; })));
    }
  });
});

server.listen(3000, () => {
  console.log('...listening on *:3000...');
});
