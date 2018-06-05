import * as Koa from 'koa'
import { Context } from 'koa'
import { CableState, ChargingState, ChargingStation, updateHandler } from './charging-station'
import { httpRequest } from './http-request.js'
import { URL } from 'url'
import { getCo2, getPrice } from './market.js'
import { getBalanceOf, transfer } from './eth.js'

const cors = require('koa-cors')
const app = new Koa()

// hardcoded one known stations address
const STATION_ONE = '0xBd65990E92e07567c472e4A6a24291Bf6AefCdb9'
ChargingStation.idIp.set(STATION_ONE, 'http://localhost:8888')

!(function(){
  // one charging station with hardcoded ID
  updateHandler(STATION_ONE,
    Object.freeze({})
    , {
      onDisconnect,
      onReady,
    })
})()

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

const latestTransfer = new Map<string, string>()
latestTransfer.set(STATION_ONE, '0x51f8A5d539582EB9bF2F71F66BCC0E6B37Abb7cA')

app.listen((process.env.PORT || 3000),  async() => {
  console.log("App listening on " + (process.env.PORT || 3000))
  if (process.argv[2] == 'test') {
    try {
      const result = await httpRequest(`http://localhost:8888/status?id=` + '0x51f8A5d539582EB9bF2F71F66BCC0E6B37Abb7cA&url=http://localhost:8888', {method: "GET"})
      console.log(result.statusCode, result.json || result.body)
    }
    catch (e) {
      console.error(e)
    }
  }
})

function onReady() {
  console.debug('READY')
  app.use( router)
}

async function onDisconnect(id:string, started:ChargingState, ended:ChargingState):Promise<void> {
  // calc stuff
  const kWh = ended.kWhTotal - started.kWhTotal
  const [balance, price] = await Promise.all([getBalanceOf(id), getPrice()])
  const amountToPay = price * kWh
  const change = balance - amountToPay
  const rounded_2decimal = Math.floor(change * 10 ** 2) / 10 ** 2

  if (rounded_2decimal < 1.00) return console.log(`Bailing; returns was only ${rounded_2decimal}`)

  // do payouts if possible
  console.log(`Delta kWh on disconnect ${kWh}, total amount due ${amountToPay}, change to return ${rounded_2decimal}`)

  const returnAddress = latestTransfer.get(id)

  if (!returnAddress) return console.log("There was not return address set!")

  if (amountToPay > balance) return  console.log("PROBLEM there was not enough balance to pay")

  try {
    await transfer(returnAddress, rounded_2decimal)
  }
  catch (e) {
    console.error(e)
  }
}

routes.set('/start', async (ctx:Context) => {
  const id:string = ctx.request.query.id
  console.assert(!!id, `missing query parameter 'id'`)

  const returnFundsTo:string = ctx.request.query.return
  if (returnFundsTo) {
    latestTransfer.set(id, returnFundsTo)
  }

  const baseUrl:URL = (ctx.request.query.url) ? new URL(  decodeURIComponent(ctx.request.query.url) ) : new URL(ChargingStation.idIp.get(STATION_ONE))

  const budget = await getBalanceOf(id)

  const station = new ChargingStation(id, baseUrl.toString())
  const state = ChargingStation.handle.get(station.id)

  const isCharging = (state.kW > 0.1 && state.cable === CableState.READY_TO_CHARGE || state.cable === CableState.READY_TO_NEGOTIATE)
  const canStart = (budget > 10 && !isCharging)

  if (canStart) {
    await station.setCharging(true)
    ctx.response.status = 204
  }
  else {
    ctx.response.body = {error: {message: "Not connected"}}
  }
})

routes.set('/stop', async (ctx:Context) => {
  const id = ctx.request.query.id
  console.assert(!!id, `missing query parameter 'id'`)

  const baseUrl:URL = (ctx.request.query.url) ? new URL(  decodeURIComponent(ctx.request.query.url) ) : new URL(ChargingStation.idIp.get(STATION_ONE))
  const station = new ChargingStation(id, baseUrl.toString())
  await station.setCharging(false)
})

routes.set('/status', async (ctx:Context) => {
  const id = ctx.request.query.id
  console.assert(!!id, `missing query parameter 'id'`)

  const baseUrl:URL = (ctx.request.query.url) ? new URL(  decodeURIComponent(ctx.request.query.url) ) : new URL(ChargingStation.idIp.get(STATION_ONE))
  const station:ChargingStation = new ChargingStation(id, baseUrl.toString())

  const returnFundsTo:string = ctx.request.query.return
  if (returnFundsTo) {
    latestTransfer.set(id, returnFundsTo)
  }

  const [price, co2, balance] = await Promise.all([getPrice(), getCo2(), getBalanceOf(id)])

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

