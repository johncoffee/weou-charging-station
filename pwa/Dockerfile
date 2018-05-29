
# Build command:
#    docker build -t charger_server .
# Run command:
#    docker run -p 8000:3000 charger_server

FROM node:9
MAINTAINER Pierre-Elouan Rethore <pe@retho.re>

RUN npm install -g typescript
RUN npm install -g http-server

RUN mkdir /app
WORKDIR /app
COPY pwa ./pwa
WORKDIR /app/pwa
RUN npm -i install
RUN tsc
WORKDIR /app
COPY package.json ./
RUN npm -i install
WORKDIR /app/pwa

EXPOSE 8080
CMD http-server -c-1 -o --cors
