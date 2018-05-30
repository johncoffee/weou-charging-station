import { httpRequest, ParsedIncomingMessage } from './http-request.js'
import { getValueFieldAsNumber, getValueFieldAsString } from './xml-parsing.js'
import { URL } from 'url'

export interface ChargingState {
  chargingId: string,
  kW: number,
  kWhTotal: number,
  limit: number,
  lastUpdate:Date
}

export class ChargingStation {
  readonly id:string
  readonly baseUrl:string

  static handle:Map<string, ChargingState> = new Map<string, ChargingState>()
  static updateDelay = 50

  constructor(id: string, baseUrl:string) {
    this.id = id
    const url = new URL(baseUrl)
    url.pathname = `/typebased_WS_EVSE/EVSEWebService/Toppen_EVSE`
    this.baseUrl = url.toString()

    const state:ChargingState = ChargingStation.handle.get(this.id)
    console.log(state ? "last updated "+state.lastUpdate : "No state, refreshing...")
    if (!state ||
      (new Date().getTime()/1000) - state.lastUpdate.getTime()/1000 > ChargingStation.updateDelay) {

      this.status( this.baseUrl)
        .then(newState => {
          ChargingStation.handle.set(this.id, newState)
          console.log("newState:",ChargingStation.handle.get(this.id))
        })
        .catch(err => console.error(err))
    }
    else {
      console.log("Waiting...")
    }
  }

  //http://hub:8000/getvar?var=price_per_kwh
  //http://hub:8000/getvar?var=local_co2
  private async status(baseUrl:string):Promise<ChargingState> {
    const results:ParsedIncomingMessage[] = await Promise.all([
      httpRequest(`${baseUrl}/getActiveEnergyImport`),
      httpRequest(`${baseUrl}/getACActivePower`),
      httpRequest(`${baseUrl}/getCurrentLimit`),
      // httpRequest(`${this.baseUrl}/getAuthenticatedVehicle`),
    ])

    let failed = results.find(res => res.statusCode >= 300)
    if (failed) {
      throw new Error('HTTP ' + failed.statusCode)
    }

    const [kWhTotal, kW, limit] = results
      .map(response => getValueFieldAsNumber(response.body))

    console.assert(false == Number.isNaN( kW ) && kW >= 0, `bad kW ${kW}`)
    console.assert(false == Number.isNaN( kWhTotal) && kWhTotal >= 0, `bad kWhTotal ${kWhTotal}`)
    console.assert(false == Number.isNaN( limit) && limit >= 0, `bad limit ${limit}`)

    return Object.freeze(<ChargingState>{
      kW,
      kWhTotal,
      limit,
      lastUpdate: new Date(),
      chargingId: "-1",
    })
  }

  async startCharge (price:number, budget:number):Promise<number> {
    const amps = 32

    const url = new URL(this.baseUrl)
    url.pathname += `setCurrentLimit/${amps}`
    await httpRequest(url.toString(), {
      method: 'PUT'
    })

    const t0 = new Date()
    const maxChargeCycle = 30 // seconds
    let chargeCycle:number = maxChargeCycle
    let status:ChargingState

    do {
      let wattage:number = status.kW/1000 // = 0.0077 // Mj/s
      price = 200/3.6 // 200 cents/kWh = 200/3.6 cents / 3.6/3.6 Mj = 55.5556 / 1
      // let budget:number = 400 // cents

      if (status.kW > 0) {
        // find time
        const t1 = new Date()
        const elapsedTime_s = (t1.getTime() - t0.getTime()) / 1000
        const cents_s = wattage * price // 0.0077 Mj/s * 55.5556 cents / Mj = 4.2 cents/s
        const subtract = elapsedTime_s * cents_s // s - cents / s
        budget -= subtract // cents
        const budgetInSeconds = calcSeconds(budget, wattage, price)

        chargeCycle = Math.min(maxChargeCycle, budgetInSeconds) // max 1
        await wait(chargeCycle)
      }
    }
    while (chargeCycle > 0)

    await this.setCurrentLimit(6)

    return budget
  }

  async setCurrentLimit (limit:number) {
    console.assert(limit > 0 && limit <= 32, `Number should be 0-32, ${limit} given`)
    try {
      const url = new URL(this.baseUrl)
      url.pathname += `setCurrentLimit/${limit}`
      await httpRequest(url.toString(), {
        method: 'PUT'
      })
    }
    catch (e) {
      console.error("Failed stopCharge")
      console.error(e)
    }
  }
}

function calcSeconds(budget_cents:number, wattage_Mjs:number, price_cents:number):number {
  // budget 2 Mj = 400 cents / 200 cents/Mj
  // time 259 s = 2 Mj / 0.0077 Mj/s
  const budget_Mj = budget_cents / price_cents
  const time_s = budget_Mj / wattage_Mjs
  return time_s
}

async function wait (delay:number) {
  return new Promise(resolve => setTimeout(()=> resolve(), delay * 1000))
}
