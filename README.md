# Shared repo for charging station frontend and backend

## Running 

`npm start`

## Install and compile

`cd charging-station`

`npm install`

`tsc` to compile typescript to javascript

### Prerequistites

`npm install -g typescript`

## Docker

Rebuild and run charging station 

First compile the source, see Install and compile

`docker build -t charging-station .`

`docker run -p 3000:3000 charging-station`

`docker stop $(docker ps -qa)`