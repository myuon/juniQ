# juniQ

## build

```shell
% sudo apt install cmake g++ python3 python3-pip libopenblas-dev libx11-dev libpng-dev
% cd server
server % wget -P data http://dlib.net/files/shape_predictor_68_face_landmarks.dat.bz2
server % bunzip2 data/shape_predictor_68_face_landmarks.dat.bz2
server % pip3 install .
```
