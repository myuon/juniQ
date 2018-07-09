import * as path from 'path';
import * as http from 'http';
import * as socketio from 'socket.io';
import * as express from 'express';

let app = express();
let server = new http.Server(app);
let io = socketio(server);
let socket_ = null;

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

app.get('/dist/**', (req, res) => {
  res.sendFile(path.resolve('.' + req.path));
});

io.on('connection', (socket) => {
  socket_ = socket;
  console.log('websocket connect!');
});

server.listen(3000, () => {
  console.log('...listening on *:3000...');
});
