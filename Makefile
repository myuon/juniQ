build: viewer/dist
	docker-compose run --rm gulp

viewer/dist: viewer/cubism-js/package.json server/data/shape_predictor_68_face_landmarks.dat
	docker-compose build --no-cache

server/data/shape_predictor_68_face_landmarks.dat:
	wget -P server/data 'http://dlib.net/files/shape_predictor_68_face_landmarks.dat.bz2'
	bunzip2 server/data/shape_predictor_68_face_landmarks.dat.bz2

viewer/cubism-js/package.json:
	git submodule init
	git submodule update
	make preparation

