FROM python:3.6-stretch

RUN apt update && apt install -y cmake g++ libopenblas-dev libx11-dev libpng-dev
ADD requirements.txt /server/requirements.txt

WORKDIR /server
RUN pip3 install -r requirements.txt

ADD . /server

RUN ls ./data
CMD python3 src/main.py

