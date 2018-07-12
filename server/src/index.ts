import * as path from 'path';
import * as http from 'http';
import * as socketio from 'socket.io';
import * as express from 'express';

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

io.on('connection', (socket) => {
  socket_ = socket;
  console.log('websocket connect!');
});

server.listen(3000, () => {
  console.log('...listening on *:3000...');
});
