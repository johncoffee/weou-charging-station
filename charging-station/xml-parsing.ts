/*
# Get the total amount of energy imported by the charger. Value returned should be in kWh
curl http://localhost:8080/typebased_WS_EVSE/EVSEWebService/Toppen_EVSE/getActiveEnergyImport

<?xml version="1.0" encoding="UTF-8" standalone="yes"?><compositeMeasurement><timestampMicros>1527503513539000</timestampMicros><timePrecision>1983</timePrecision><quality>0</quality><validity>0</validity><source>0</source><value>5.9</value></compositeMeasurement>

# Set the charger to maximum charging capacity. Value insterted should be between [6.0,32.0] Amps
curl -X PUT http://localhost:8080/typebased_WS_EVSE/EVSEWebService/Toppen_EVSE/setCurrentLimit/32

(no response)

# Get the current charging capacity. Value returned between [6.0,32.0] Amps
curl http://localhost:8080/typebased_WS_EVSE/EVSEWebService/Toppen_EVSE/getCurrentLimit

<?xml version="1.0" encoding="UTF-8" standalone="yes"?><compositeMeasurement><timestampMicros>1527503668224000</timestampMicros><timePrecision>1983</timePrecision><quality>0</quality><validity>0</validity><source>0</source><value>32.0</value></compositeMeasurement>

# Get the current power output. Value returned between [0.0,22.0] kW
curl http://localhost:8080/typebased_WS_EVSE/EVSEWebService/Toppen_EVSE/getACActivePower

<?xml version="1.0" encoding="UTF-8" standalone="yes"?><compositeMeasurement><timestampMicros>1527504241409000</timestampMicros><timePrecision>1983</timePrecision><quality>0</quality><validity>0</validity><source>0</source><value>0.0</value></compositeMeasurement>

# Get the ID of the car using RFID token:
curl http://localhost:8080/typebased_WS_EVSE/EVSEWebService/Toppen_EVSE/getAuthenticatedVehicle

<?xml version="1.0" encoding="UTF-8" standalone="yes"?><compositeLong><timestampMicros>0</timestampMicros><timePrecision>16</timePrecision><quality>0</quality><validity>2</validity><source>2</source><value>-9223372036854775808</value></compositeLong>

If the validity is 2 and the value is negative (-9223372036854775808), then there isn't any RFID tag.
Otherwise validity is 0 and the value is positve.

*/

import * as cheerio from 'cheerio'

export function getValueFieldAsNumber(xml:string):number {
  const $ = cheerio.load(xml, {
    xmlMode: true
  })
  const value:string = $('compositeMeasurement value').text()
  return parseFloat(value)
}

export function getValueFieldAsString(xml:string):string {
  const $ = cheerio.load(xml, {
    xmlMode: true
  })
  const value:string = $('compositeLong value').text()
  return value
}

export function getStatus(xml:string):string {
  const $ = cheerio.load(xml, {
    xmlMode: true
  })
  const value:string = $('status status').text()
  return value
}