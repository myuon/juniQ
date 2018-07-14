//import { FacialParts } from '../../server/src/index';

let getUserMedia = (
  navigator.getUserMedia ||
  (navigator as any).webkitGetUserMedia ||
  (navigator as any).mozGetUserMedia
).bind(navigator);

let video = document.getElementById('video') as HTMLVideoElement;

getUserMedia({video: true, audio: false}, (stream: any) => {
  video.src = URL.createObjectURL(stream);
  
  let socket = io('http://localhost:3000');

  socket.on('parts', (parts: any) => {
	let canvas = document.getElementById('parts-canvas') as HTMLCanvasElement;
	let context = canvas.getContext('2d');

	context.clearRect(0,0,640,480);

	const connectLines = (arr: {x: number, y:number}[]) => {
	  context.beginPath();
	  context.moveTo(arr[0].x, arr[0].y);
  	  for (let i = 1; i < arr.length; i ++) {
		context.lineTo(arr[i].x, arr[i].y);
		context.moveTo(arr[i].x, arr[i].y);
	  }
	  context.stroke();
	};

	connectLines(parts.face);
	connectLines(parts.eye_left);
	connectLines(parts.eye_right);
	connectLines(parts.eyeblow_left);
	connectLines(parts.eyeblow_right);
	connectLines(parts.eye_left);
	connectLines(parts.eye_right);
	connectLines(parts.nose_bridge);
	connectLines(parts.nasal_cavity);
	connectLines(parts.mouth_inner);
	connectLines(parts.mouth_outer);
  });

  socket.on('connect', () => {
	let canvas = document.getElementById('video-canvas') as HTMLCanvasElement;
	let context = canvas.getContext('2d');

	video.addEventListener('play', () => {
	  setInterval(() => {
		context.drawImage(video, 0, 0, 320, 240);
		socket.emit('img', canvas.toDataURL('image/jpeg', 0.6));
	  }, 1000);
	});
  });
}, (err: any) => {
  console.log("*** Error ***");
  console.log(err);
});
