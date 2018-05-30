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
  static updateDelay = 5.6

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
      // console.log("Waiting...")
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

  async chargeBudget (price_pr_kWh:number, budget:number):Promise<number> {

    const chargingStationBaseUrl = new URL(this.baseUrl)
    chargingStationBaseUrl.pathname += `/setCurrentLimit/32`
    const startRes = await httpRequest(chargingStationBaseUrl.toString(), {method: 'PUT'})
    console.assert(startRes.statusCode < 300, `Should have started (${startRes.statusCode} ${startRes.statusMessage})`)

    const maxChargeCycle = 5 // seconds
    let chargeCycle:number = maxChargeCycle

    const stateInitial = ChargingStation.handle.get(this.id)
    let start_Mj:number =  stateInitial.kWhTotal/3.6
    // 1kWh = 3.6 Mj
    const price_pr_Mj = price_pr_kWh/3.6 // 200 cents/3.6Mj = 55.5556 cents / 1 Mj

    while (chargeCycle > 0 && chargeCycle < 60 * 60 * 12) {
      const state = ChargingStation.handle.get(this.id)
      const wattage_MW:number = state.kW/1000 // = 0.0077 // Mj/s
      if (state.kW > 1) { // margin for charger own usage or other possible weird effects
        // find time
        const spent_Mj = state.kWhTotal/3.6 - start_Mj
        start_Mj = state.kWhTotal/3.6
        const cents_spent = spent_Mj * price_pr_Mj
        console.log(`Subtract ${cents_spent}`)
        budget -= cents_spent
      }

      const secondsLeft = calcSeconds(budget, wattage_MW, price_pr_Mj)
      console.log(`With wattage ${wattage_MW} and price ${price_pr_Mj} there's ${secondsLeft} s left`)
      chargeCycle = Math.min(maxChargeCycle, secondsLeft)
      await wait(chargeCycle)
    }

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

function calcSeconds(budget_cents:number, wattage_Mjs:number, cents_pr_Mj:number):number {
  // budget 2 Mj = 400 cents / 200 cents/Mj
  // time 259 s = 2 Mj / 0.0077 Mj/s
  const budget_Mj = budget_cents / cents_pr_Mj
  const time_s = budget_Mj / wattage_Mjs
  return time_s
}

function wait (delay:number):Promise<void> {
  return new Promise(resolve => setTimeout(() => resolve(), delay * 1000))
}
