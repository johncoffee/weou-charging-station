FROM node:9
MAINTAINER Pierre-Elouan Rethore <pe@retho.re>

RUN mkdir /app
WORKDIR /app

RUN npm i -g http-server

# app dependencies
COPY package*.json ./
RUN npm install

# app contents
COPY src src/
COPY assets assets/
COPY index.html ./

COPY tsconfig.json ./
RUN npm run ts-compile

EXPOSE 8080
CMD http-server /app -c-1 --cors
