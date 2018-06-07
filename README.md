# Shared repo for charging station frontend and backend

This codebase has a lot of moving parts! Let me start by sketching out the business flow of charging a vehicle.
    
  1. Buy tokens 
  2. Transfer at least 50 tokens to the address of the charging station
  3. Plugin the cable
  4. Wait for the charging to complete, or simply unplug the cable.         
     You'll get any remaining tokens back after you unplug the cable
       
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