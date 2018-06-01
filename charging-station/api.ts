import * as Koa from 'koa'
import { Context } from 'koa'
import { CableState, ChargingState, ChargingStation, wait } from './hardware.js'
import { getBalanceOf } from './eth.js'
import { httpRequest } from './http-request.js'
import { URL } from 'url'
import { getCo2, getPrice } from './market.js'

const cors = require('koa-cors')
const app = new Koa()

const routes = new Map<string, Function>()

const router = async (ctx:Context) => {
  console.log(ctx.method, ctx.request.originalUrl)
  const fn = routes.get(ctx.request.path)
  if (fn) {
    await fn(ctx)
  }
  else {
    console.log("Didn't find handler for route: " + ctx.request.path)
  }
}

app.use( cors({
  origin: "*",
  methods: ['GET'],
  headers: ['Content-Type'],
}))

app.use( router)

app.listen((process.env.PORT || 3000),  async() => {
  console.log("App listening on " + (process.env.PORT || 3000))
  if (process.argv[2] == 'test') {
    try {
      const result = await httpRequest(`http://localhost:8888/status?id=` + '0x51f8a5d539582eb9bf2f71f66bcc0e6b37abb7ca&url=http://localhost:8888', {method: "GET"})
      console.log(result.statusCode, result.json || result.body)
    }
    catch (e) {
      console.error(e)
    }
  }
})


async function updateHandler () {
  const station = new ChargingStation('0x51f8a5d539582eb9bf2f71f66bcc0e6b37abb7ca', 'http://10.170.143.204:8080')
  // const station = new ChargingStation('0x51f8a5d539582eb9bf2f71f66bcc0e6b37abb7ca', 'http://localhost:8888')
  let state:ChargingState = ChargingStation.handle.get(station.id)
  let newState:ChargingState
  try {
    newState = await station.pollStatus()
  }
  catch (e) {
    console.error(e)
  }

  if (newState.cable !== state.cable) {
    if (newState.cable === CableState.NO_CABLE) {
      onDisconnect(station.id)
    }
  }

  await wait(5)
  updateHandler()
}

function onDisconnect(id:string) {
  console.debug("Disconnect")
}

updateHandler()

routes.set('/start', async (ctx:Context) => {
  const chargingStagingAddress:string = ctx.request.query.id
  const returnFundsAddress:string = ctx.request.query.return
  console.assert(!!chargingStagingAddress, `missing query parameter 'id'`)
  const baseUrl = new URL(  decodeURIComponent(ctx.request.query.url) )

  const budget = await getBalanceOf(chargingStagingAddress)

  const station = new ChargingStation(chargingStagingAddress, baseUrl.toString())
  const state = ChargingStation.handle.get(station.id)

  const isCharging = (state.kW > 0.1 && state.cable === CableState.READY_TO_CHARGE || state.cable === CableState.READY_TO_NEGOTIATE)
  const canStart = (budget > 10 && !isCharging)

  if (canStart) {
    await station.setCharging(true)
    ctx.response.status = 204
    // const start_kWh = state.kWhTotal
    // const returnFunds:number = await station.chargeBudget(200, budget) // dont await this, it will run for hours
    // if (returnFunds > 0) {
    //   console.log(`transfer rest to ${returnFundsAddress} ${returnFunds}`)
    //   transferFrom(chargingStagingAddress, returnFundsAddress, returnFunds)
    //     .catch(err => console.error(err))
  }
  else {
    ctx.response.body = {error: {message: "Not connected"}}
  }
})

routes.set('/stop', async (ctx:Context) => {
  const id = ctx.request.query.id
  console.assert(!!id, `missing query parameter 'id'`)
  const baseUrl = new URL(  decodeURIComponent(ctx.request.query.url) )
  const station = new ChargingStation(id, baseUrl.toString())
  await station.setCharging(false)
})

routes.set('/status', async (ctx:Context) => {
  const id = ctx.request.query.id
  const baseUrl = new URL(  decodeURIComponent(ctx.request.query.url) )

  const station:ChargingStation = new ChargingStation(id, baseUrl.toString())

  const chargingStagingAddress:string = ctx.request.query.id

  const [price, co2, balance] = await Promise.all([getPrice(), getCo2(), getBalanceOf(chargingStagingAddress)])

  // console.log(response)
  const results = Object.seal({
    co2,
    price,
    balance,

    chargingId: "-1",
    kW: -1,
    kWhTotal: -1,
    limit: -1,
    cable: -1,
    lastUpdate: new Date(0),
  })

  const state:ChargingState = ChargingStation.handle.get(station.id)
  Object.keys(state).forEach((k:keyof ChargingState) => results[k] = state[k])

  ctx.body = Object.freeze(results)
})

