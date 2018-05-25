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
RUN tsc *.ts --lib 'ES2015'

EXPOSE 3000
CMD npm start
