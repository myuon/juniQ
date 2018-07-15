//import { FacialParts } from '../../server/src/index';

export interface FacialParts {
  chin: [number,number][],
  left_eye: [number,number][],
  left_eyebrow: [number,number][],
  nose_bridge: [number,number][],
  nose_tip: [number,number][],
  right_eye: [number,number][],
  right_eyebrow: [number,number][],
  top_lip: [number,number][],
  bottom_lip: [number,number][],
};

let getUserMedia = (
  navigator.getUserMedia ||
  (navigator as any).webkitGetUserMedia ||
  (navigator as any).mozGetUserMedia
).bind(navigator);

let video = document.getElementById('video') as HTMLVideoElement;

getUserMedia({video: true, audio: false}, (stream: any) => {
  video.src = URL.createObjectURL(stream);
  
  let socket = io('http://localhost:3000');

  socket.on('parts', (parts: FacialParts) => {
    let canvas = document.getElementById('parts-canvas') as HTMLCanvasElement;
    let context = canvas.getContext('2d');

    context.clearRect(0,0,640,480);

    const connectLines = (arr: [number,number][]) => {
      context.beginPath();
      context.moveTo(arr[0][0], arr[0][1]);
        for (let i = 1; i < arr.length; i ++) {
      context.lineTo(arr[i][0], arr[i][1]);
      context.moveTo(arr[i][0], arr[i][1]);
      }
      context.stroke();
    };

    connectLines(parts.chin);
    connectLines(parts.left_eye);
    connectLines(parts.right_eye);
    connectLines(parts.left_eyebrow);
    connectLines(parts.right_eyebrow);
    connectLines(parts.nose_bridge);
    connectLines(parts.nose_tip);
    connectLines(parts.top_lip);
    connectLines(parts.bottom_lip);
  });

  socket.on('connect', () => {
    let canvas = document.getElementById('video-canvas') as HTMLCanvasElement;
    let context = canvas.getContext('2d');

    setInterval(() => {
      context.drawImage(video, 0, 0, 320, 240);
      socket.emit('img', canvas.toDataURL('image/jpeg', 0.6));
    }, 100);
  });
}, (err: any) => {
  console.log("*** Error ***");
  console.log(err);
});
