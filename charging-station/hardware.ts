import { httpRequest, ParsedIncomingMessage } from './http-request.js'
import { getStatus, getValueFieldAsNumber, getValueFieldAsString } from './xml-parsing.js'
import { URL } from 'url'

export interface ChargingState {
  chargingId: string,
  kW: number,
  kWhTotal: number,
  // limit: number,
  lastUpdate:Date,
  cable:CableState
}

export enum CableState {
  NO_CABLE = 1,
  READY_TO_NEGOTIATE = 2,
  READY_TO_CHARGE = 3,
}

export class ChargingStation {
  readonly id:string
  readonly baseUrl:string

  static handle:Map<string, ChargingState> = new Map<string, ChargingState>()
  static updateDelay:number = 5

  constructor(id: string, baseUrl:string) {
    this.id = id
    const url = new URL(baseUrl)
    url.pathname = `/typebased_WS_EVSE/EVSEWebService/Toppen_EVSE`
    this.baseUrl = url.toString()

    if (!ChargingStation.handle.has(this.id)) {
      ChargingStation.handle.set(this.id, Object.freeze(<ChargingState>{
        kW: -1,
        kWhTotal: -1,
        cable: -1,
        lastUpdate: new Date(0),
        chargingId: "-1",
      }))
    }
  }

  async pollStatus():Promise<ChargingState> {
    let state:ChargingState = ChargingStation.handle.get(this.id)

    let updatedSecondsAgo:number = new Date().getTime()/1000 - state.lastUpdate.getTime()/1000
    console.log(state ? `last updated ${updatedSecondsAgo} s ago` : "No state, refreshing...")
    let retries:number = 3
    while (retries > 0 && updatedSecondsAgo > ChargingStation.updateDelay) {
      try {
        const newState = await ChargingStation.fetchStatus( this.baseUrl)
        updatedSecondsAgo = (newState) ? new Date().getTime()/1000 - state.lastUpdate.getTime()/1000 : ChargingStation.updateDelay

        // validate state
        console.assert(!Number.isNaN(newState.kW ), `bad kW ${newState.kW}`)
        console.assert(!Number.isNaN(newState.kWhTotal) && newState.kWhTotal >= 0, `bad kWhTotal ${newState.kWhTotal}`)

        ChargingStation.handle.set(this.id, newState)
        state = newState
      }
      catch (e) {
        console.error(e)
        retries -= 1
        console.log("Failed updating state ("+retries+" retries left), retrying in 5 sec...")
        await wait(5)
      }
      console.log("newState:",ChargingStation.handle.get(this.id))
    }

    return state
  }

  static async fetchStatus(baseUrl:string):Promise<ChargingState> {
    const results:ParsedIncomingMessage[] = await Promise.all([
      httpRequest(`${baseUrl}/getActiveEnergyImport`),
      httpRequest(`${baseUrl}/getACActivePower`),
      httpRequest(`${baseUrl}/getCurrentVehicleState`),
      // httpRequest(`${baseUrl}/getCurrentLimit`),
      // httpRequest(`${this.baseUrl}/getAuthenticatedVehicle`),
    ])

    let failed = results.find(res => res.statusCode >= 300)
    if (failed) {
      throw new Error('HTTP ' + failed.statusCode)
    }
    const kWhTotal:number = getValueFieldAsNumber(results[0].body)
    const kW:number = getValueFieldAsNumber(results[1].body)
    const cable:CableState = parseInt(getStatus(results[2].body), 10)

    return Object.freeze(<ChargingState>{
      kW,
      kWhTotal,
      cable,
      lastUpdate: new Date(),
      chargingId: "-1",
    })
  }

  async chargeBudget (price_pr_kWh:number, budget:number):Promise<number> {
    const maxChargeCycle = 5 // seconds
    let chargeCycle:number = maxChargeCycle

    await this.pollStatus()
    const stateInitial = ChargingStation.handle.get(this.id)
    let start_Mj:number =  stateInitial.kWhTotal/3.6
    // 1kWh = 3.6 Mj
    const price_pr_Mj = price_pr_kWh/3.6 // 200 cents/3.6Mj = 55.5556 cents / 1 Mj

    while (chargeCycle > 0 && chargeCycle < 60 * 60 * 12) {
      const state = ChargingStation.handle.get(this.id)
      const wattage_MW = state.kW/1000 // = 0.0077 // Mj/s
      if (state.kW > 1) { // margin for charger own usage or other possible weird effects
        // find time
        const spent_Mj = state.kWhTotal/3.6 - start_Mj
        start_Mj = state.kWhTotal/3.6
        const cents_spent = spent_Mj * price_pr_Mj
        console.log(`Subtract ${cents_spent} budget ${budget}`)
        budget -= cents_spent
      }

      const secondsLeft = calcSeconds(budget, wattage_MW, price_pr_Mj)
      console.log(`Terminated at budget ${budget}`)
      console.log(`With wattage ${wattage_MW} and price ${price_pr_Mj} there's ${secondsLeft} s left`)
      chargeCycle = Math.min(maxChargeCycle, secondsLeft)

      if (chargeCycle > 0) {
        await Promise.all([wait(chargeCycle), this.pollStatus()])
      }
    }

    return budget
  }

  async setCharging (state:boolean = true) {
    const url = new URL(this.baseUrl)
    url.pathname += `/enableCharging/${state}`
    await httpRequest(url.toString(), {method: 'PUT'})
  }
}

function calcSeconds(budget_cents:number, wattage_Mjs:number, cents_pr_Mj:number):number {
  // budget 2 Mj = 400 cents / 200 cents/Mj
  // time 259 s = 2 Mj / 0.0077 Mj/s
  const budget_Mj = budget_cents / cents_pr_Mj
  const time_s = budget_Mj / wattage_Mjs
  return time_s
}

export function wait (delay:number):Promise<void> {
  return new Promise(resolve => setTimeout(() => resolve(), delay * 1000))
}
