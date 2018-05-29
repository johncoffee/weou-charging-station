FROM node:9
MAINTAINER Pierre-Elouan Rethore <pe@retho.re>

RUN mkdir /app
WORKDIR /app

# app dependencies
COPY package*.json ./
RUN npm install

# app contents
COPY *.ts ./
COPY *.json ./
RUN npm run ts-compile

EXPOSE 3000
CMD npm start