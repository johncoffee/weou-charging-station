import * as Koa from 'koa'
import { Context } from 'koa'
import { CableState, ChargingState, ChargingStation } from './hardware.js'
import { getBalanceOf, transferFrom } from './eth.js'
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
      const result = await httpRequest(`http://localhost:3000/status?id=` + '0x51f8a5d539582eb9bf2f71f66bcc0e6b37abb7ca&url=http://localhost:8888')
      console.log(result.statusCode, result.json || result.body)
    }
    catch (e) {
      console.error(e)
    }
  }
})

routes.set('/start', async (ctx:Context) => {
  const chargingStagingAddress:string = ctx.request.query.id
  const returnFundsAddress:string = ctx.request.query.return
  console.assert(!!chargingStagingAddress, `missing query parameter 'id'`)
  const baseUrl = new URL(  decodeURIComponent(ctx.request.query.url) )

  const budget = await getBalanceOf(chargingStagingAddress)

  const station = new ChargingStation(chargingStagingAddress, baseUrl.toString())
  const state = await station.pollStatus()

  if (state.cable != CableState.NO_CABLE) {
    await station.setCharging(true)
    console.log("STARTED charging!")
    // const returnFunds:number = await station.chargeBudget(200, budget) // dont await this, it will run for hours
    // if (returnFunds > 0) {
    //   console.log(`transfer rest to ${returnFundsAddress} ${returnFunds}`)
    //   transferFrom(chargingStagingAddress, returnFundsAddress, returnFunds)
    //     .catch(err => console.error(err))
    // }
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

  const balance:number = chargingStagingAddress ? await getBalanceOf(chargingStagingAddress) : -1
  const price:number = await getPrice()
  const co2:number = await getCo2()

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

  const state = await station.pollStatus()
  Object.keys(state).forEach((k:keyof ChargingState) => results[k] = state[k])

  ctx.body = Object.freeze(results)
})

