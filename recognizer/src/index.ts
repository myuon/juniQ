let getUserMedia = (
    navigator.getUserMedia ||
    (navigator as any).webkitGetUserMedia ||
    (navigator as any).mozGetUserMedia
).bind(navigator);

let video = document.getElementById('video') as HTMLVideoElement;

getUserMedia({video: true, audio: false}, (stream: any) => {
    console.log(stream);
    video.src = URL.createObjectURL(stream);
    
    let socket = io('http://localhost:3000');
    socket.on('connect', () => {
        let peer = new Peer(socket.ids, { host: 'localhost', port: 3000, path: '/peerjs' });
    });
}, (err: any) => {
    console.log("*** Error ***");
    console.log(err);
});
