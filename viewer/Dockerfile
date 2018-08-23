FROM node:alpine

RUN npm i -g gulp
ADD . .
WORKDIR /viewer
RUN npm i

CMD npx gulp

