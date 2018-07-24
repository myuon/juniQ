const get_request = (url: string) => {
  var request = new XMLHttpRequest();
  request.open('GET', url);
  request.send(null);  
}

// model parameters
window.addEventListener('message', (event: MessageEvent) => {
  let elem = document.getElementById('viewer');
  elem.style.width = `${event.data.size[0]}px`;
  elem.style.height = `${event.data.size[1]}px`;

  let div = document.getElementById('parameter-controls');
  for (let parameter of event.data.parameters) {
    div.innerHTML += (
      `<div class="pure-g" style="padding: 10px;" id="${parameter.id}">
        <div class="pure-u-1-3" style="text-align: right;">${parameter.id}</div>
        <div class="pure-u-1-3" style="text-align: center;"><input type="range" min="${parameter.min}" max="${parameter.max}" value="${parameter.default}" step="0.01" class="pure-u-2-5 value-range" id="${parameter.id}" /></div>
        <div class="pure-u-1-3"><input type="text" value="${parameter.default}" class="pure-u-1-5 value-entry" /></div>
      </div>`);
  }

  // innerHTMLするとevent listenerが消えるので
  // ここでまとめて登録する
  for (let parameter of event.data.parameters) {
    let control = document.getElementById(parameter.id);

    control.getElementsByClassName('value-range')[0].addEventListener('change', (event: Event) => {
      let element = event.target as HTMLInputElement;
      let new_value = element.value;
      (control.getElementsByClassName('value-entry')[0] as HTMLInputElement).value = new_value;

      let json: {[key:string]: any} = {};
      json[element.id] = element.value;
      get_request(`http://localhost:3000/params?${element.id}=${element.value}`);
    });
  }
}, { once: true });

// -------

export interface FacialParts {
  chin: [number,number][],
  left_eye: [number,number][],
  left_eyebrow: [number,number][],
  nose_bridge: [number,number][],
  nose_tip: [number,number][],
  right_eye: [number,number][],
  right_eyebrow: [number,number][],
  outer_lip: [number,number][],
  inner_lip: [number,number][],
};

// face recognition
let getUserMedia = (
  navigator.getUserMedia ||
  (navigator as any).webkitGetUserMedia ||
  (navigator as any).mozGetUserMedia ||
  navigator.mediaDevices.getUserMedia
).bind(navigator);

let audioContext = new ((
  (window as any).AudioContext ||
  (window as any).webkitAudioContext
).bind(window))();
let audioAnalyzer = audioContext.createAnalyser();

let video = document.getElementById('video') as HTMLVideoElement;

getUserMedia({video: true, audio: false}, (stream: MediaStream) => {
  let socket = io('http://localhost:3000');
  video.src = URL.createObjectURL(stream);

  /*
  let audioStream = audioContext.createMediaStreamSource(stream);
  let processor = audioContext.createScriptProcessor();
  processor.volume = 0;
  processor.onaudioProcess = (event: AudioProcessingEvent) => {
    this.volume = event.inputBuffer.getChannelData(0)
    console.log(this.volume);
  };
  processor.connect(audioContext.destination);
  audioStream.connect(processor);
  */
  
  socket.on('tracker', (json: { parts: FacialParts, reproject: any, eye_center: any }) => {
    const parts = json.parts;

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

    context.strokeStyle = 'rgb(255,0,0)';
    for (let pair of json.reproject) {
      context.beginPath();
      context.moveTo(pair[0][0], pair[0][1]);
      context.lineTo(pair[1][0], pair[1][1]);
      context.stroke();
    }

    context.strokeStyle = 'rgb(0,0,0)';
    connectLines(parts.chin);
    context.strokeStyle = 'rgb(255,0,0)';
    connectLines(parts.left_eye);
    context.strokeStyle = 'rgb(255,0,0)';
    connectLines(parts.right_eye);
    context.strokeStyle = 'rgb(255,0,255)';
    connectLines(parts.left_eyebrow);
    context.strokeStyle = 'rgb(255,0,255)';
    connectLines(parts.right_eyebrow);
    context.strokeStyle = 'rgb(255,255,0)';
    connectLines(parts.nose_bridge);
    context.strokeStyle = 'rgb(0,0,255)';
    connectLines(parts.nose_tip);
    context.strokeStyle = 'rgb(0,255,255)';
    connectLines(parts.outer_lip);
    context.strokeStyle = 'rgb(0,255,0)';
    connectLines(parts.inner_lip);

    context.strokeStyle = 'rgb(255,0,0)';
    context.beginPath();
    context.arc(parts.nose_tip[2][0], parts.nose_tip[2][1], 5, 0, 2 * Math.PI, false)
    context.stroke();
    context.beginPath();
    context.arc(parts.chin[8][0], parts.chin[8][1], 5, 0, 2 * Math.PI, false)
    context.stroke();
    context.beginPath();
    context.arc(parts.left_eye[0][0], parts.left_eye[0][1], 5, 0, 2 * Math.PI, false)
    context.stroke();
    context.beginPath();
    context.arc(parts.right_eye[3][0], parts.right_eye[3][1], 5, 0, 2 * Math.PI, false)
    context.stroke();
    context.beginPath();
    context.arc(parts.outer_lip[0][0], parts.outer_lip[0][1], 5, 0, 2 * Math.PI, false)
    context.stroke();
    context.beginPath();
    context.arc(parts.outer_lip[6][0], parts.outer_lip[6][1], 5, 0, 2 * Math.PI, false)
    context.stroke();

    if (json.eye_center[0] && json.eye_center[1]) {
      context.strokeStyle = 'rgb(0,0,255)';
      context.beginPath();
      context.arc(json.eye_center[0][0], json.eye_center[0][1], 3, 0, 2 * Math.PI, false)
      context.stroke();
      context.beginPath();
      context.arc(json.eye_center[1][0], json.eye_center[1][1], 3, 0, 2 * Math.PI, false)
      context.stroke();
    }
  });

  socket.on('connect', () => {
    let canvas = document.getElementById('video-canvas') as HTMLCanvasElement;
    let context = canvas.getContext('2d');

    setInterval(() => {
      context.drawImage(video, 0, 0, 320, 240);
      socket.emit('img', canvas.toDataURL('image/jpeg', 0.6));
    }, 16);
  });
}, (err: any) => {
  console.log("*** Error ***");
  console.log(err);
});
