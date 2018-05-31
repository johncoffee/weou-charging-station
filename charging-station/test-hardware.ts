import { httpRequest, ParsedIncomingMessage } from './http-request.js'

const baseUrl = `http://10.170.111.0:8088` +
  `/typebased_WS_EVSE/EVSEWebService/Toppen_EVSE`

async function main () {
  const results = await Promise.all([
    httpRequest(`${baseUrl}/getActiveEnergyImport`),
    httpRequest(`${baseUrl}/getACActivePower`),
    httpRequest(`${baseUrl}/getCurrentLimit`),
    httpRequest(`${baseUrl}/getAuthenticatedVehicle`),
    httpRequest(`${baseUrl}/getCurrentVehicleState`),
  ])

  console.log(results
    .map(res => res.body))
}

if (!module.parent) {
  main().catch(e => console.error(e))
}
