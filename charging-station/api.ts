import * as Koa from 'koa'
import { Context } from 'koa'
import { ChargingStation } from './hardware.js'
import { getBalanceOf, transferFrom } from './eth.js'
import { httpRequest } from './http-request.js'
import { URL } from 'url'
const cors = require('koa-cors')
const app = new Koa()

const routes = new Map<string, Function>()

const router = async (ctx:Context) => {
  console.debug(ctx.method, ctx.request.path, ctx.request.originalUrl)
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

  const station = new ChargingStation(chargingStagingAddress, baseUrl.toString())
  const budget = await getBalanceOf(chargingStagingAddress)
  station.startCharge(budget) // dont await this, it will run for hours
    .then(() => {
      if (returnFundsAddress)
        console.log(`transfer rest ${chargingStagingAddress} ${returnFundsAddress} ${budget}`)
        transferFrom(chargingStagingAddress, returnFundsAddress, budget)
    })
})

routes.set('/stop', async (ctx:Context) => {
  const id = ctx.request.query.id
  console.assert(!!id, `missing query parameter 'id'`)
  const baseUrl = new URL(  decodeURIComponent(ctx.request.query.url) )
  const station = new ChargingStation(id, baseUrl.toString())
  await station.stopCharge()
})

routes.set('/status', async (ctx:Context) => {
  const id = ctx.request.query.id
  const baseUrl = new URL(  decodeURIComponent(ctx.request.query.url) )

  console.assert(!!id, `missing query parameter 'id'`)

  const station:ChargingStation = new ChargingStation(id, baseUrl.toString())
  const response = await station.status()

  const balance = Math.round( Math.random() * 10000) //await getBalanceOf(ctx.request.query.id)

  // console.debug(response)
  const status = Object.freeze({
    chargingId: response.chargingId,
    kW: response.kW,
    kWhTotal: response.kWhTotal,
    charging: response.charging,
    connected: response.connected,

    co2: 34,
    price: 104,

    balance,
  })
  ctx.body = status
})

