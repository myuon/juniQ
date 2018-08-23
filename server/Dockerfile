FROM python:slim

RUN apt update && apt install -y cmake g++ libopenblas-dev libx11-dev libpng-dev libglib2.0-0
ADD requirements.txt /server/requirements.txt
RUN pip install opencv-contrib-python

WORKDIR /server
RUN pip3 install -r requirements.txt

ADD . /server

RUN apt install -y libsm-dev libxrender-dev libxext-dev
CMD python3 src/main.py

