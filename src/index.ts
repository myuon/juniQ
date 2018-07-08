import * as path from 'path';
import * as http from 'http';
import * as socketio from 'socket.io';
import * as express from 'express';

let app = express();
let server = new http.Server(app);
let io = socketio(http);

app.get('/', (req, res) => {
  res.sendFile(path.resolve('view/viewer.html'));
});

io.on('connection', (socket) => {
  console.log('connect!');
});

server.listen(3000, () => {
  console.log('...listening on *:3000...');
});
