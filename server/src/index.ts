import * as path from 'path';
import * as http from 'http';
import * as socketio from 'socket.io';
import * as express from 'express';

let app = express();
let server = new http.Server(app);
let io = socketio(server);

app.get('/', (req, res) => {
  res.send('/');
});

app.get('/dist/**', (req, res) => {
  res.sendFile(path.resolve('.' + req.path));
});

io.on('connection', (socket) => {
  console.log('connect!');

  socket.on('click!', (msg) => {
    console.log('get click! signal: ' + msg);
  });
});

server.listen(3000, () => {
  console.log('...listening on *:3000...');
});
