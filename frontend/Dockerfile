# Build command:
#    docker build -t charger_server .
# Run command:
#    docker run -p 8000:3000 charger_server

FROM node:9
MAINTAINER Pierre-Elouan Rethore <pe@retho.re>

RUN mkdir /app
WORKDIR /app
COPY . ./
RUN npm install -g typescript
RUN npm -i install
RUN npm install -g http-server
#WORKDIR /app/pwa/src
#RUN tsc *.ts --lib 'ES2015'
WORKDIR /app

EXPOSE 8080
CMD npm start
