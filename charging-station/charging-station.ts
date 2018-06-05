import { httpRequest, ParsedIncomingMessage } from './http-request.js'
import { getStatus, getValueFieldAsNumber } from './xml-parsing.js'
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
  INVALID = -1,
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

        // validate state
        console.assert(!Number.isNaN(newState.kW ), `bad kW ${newState.kW}`)
        console.assert(!Number.isNaN(newState.kWhTotal) && newState.kWhTotal >= 0, `bad kWhTotal ${newState.kWhTotal}`)

        ChargingStation.handle.set(this.id, newState)
        state = newState
        retries = 0
        console.log("newState " , ChargingStation.handle.get(this.id).cable)
      }
      catch (e) {
        console.error(e)
        retries -= 1
        console.log("Failed updating state ("+retries+" retries left), retrying in 5 sec...")
        await wait(5)
      }
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

  async setCharging (state:boolean = true) {
    const url = new URL(this.baseUrl)
    url.pathname += `/enableCharging/${state}`
    await httpRequest(url.toString(), {method: 'PUT'})
  }

  static idIp = new Map<string, string>()
}

export function wait (delay:number):Promise<void> {
  return new Promise(resolve => setTimeout(() => resolve(), delay * 1000))
}

export type EventState = {
  chargeStartState?: Readonly<ChargingState>
  onReadyFired?: boolean
}

export type Hooks = {
  onDisconnect: {(id:string, start:ChargingState, end:ChargingState):void}
  onReady: {():void}
}

export async function updateHandler (id:string, events:Readonly<EventState>, hooks:Hooks) {
  // const station = new ChargingStation('0x51f8a5d539582eb9bf2f71f66bcc0e6b37abb7ca', 'http://10.170.143.204:8080')
  // const station = new ChargingStation('0x51f8a5d539582eb9bf2f71f66bcc0e6b37abb7ca', 'http://localhost:8888')
  const station = new ChargingStation(id , ChargingStation.idIp.get(id))
  let state:ChargingState = ChargingStation.handle.get(station.id)
  let newState:ChargingState
  try {
    newState = await station.pollStatus()
  }
  catch (e) {
    console.error(e)
  }

  let chargeStartState:ChargingState = events.chargeStartState

  // first run event
  let onReadyFired = events.onReadyFired
  if (!onReadyFired && newState) {
    hooks.onReady()
    onReadyFired = true
  }

  if (newState.cable !== state.cable && state.cable !== CableState.INVALID) {
    console.log(`Cable change ${state.cable} (${CableState[state.cable]}) -> ${newState.cable} (${CableState[newState.cable]})`)
    switch (newState.cable) {
      case CableState.READY_TO_CHARGE:
      case CableState.READY_TO_NEGOTIATE:
        if (!chargeStartState) {
          chargeStartState = newState
        }
        break
      case CableState.NO_CABLE:
        chargeStartState = null
        hooks.onDisconnect(station.id, events.chargeStartState, newState)
        break
    }
  }

  await wait(5)
  updateHandler( id, Object.freeze({chargeStartState, onReadyFired}), hooks)
}
