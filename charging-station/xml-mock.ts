import * as Koa from 'koa'
import { Context } from 'koa'
const app = new Koa()

const routes = new Map<string, Function>()

const router = async (ctx:Context) => {
  console.log(ctx.method, ctx.request.path)
  const fn = routes.get(ctx.request.path)
  if (fn) {
    await fn(ctx)
  }
  else {
    console.log("Didn't find handler for route: " + ctx.request.path)
  }
}

app.use( router)

app.listen((process.env.PORT || 8888), () => {
  console.log("App listening on " + (process.env.PORT || 8888))
})

const base = `/typebased_WS_EVSE/EVSEWebService/Toppen_EVSE`

routes.set(`${base}/getActiveEnergyImport`, (ctx:Context) => {
  ctx.headers['Content-Type'] = "application/xml"
  ctx.response.body = `
    <?xml version="1.0" encoding="UTF-8" standalone="yes"?><compositeMeasurement><timestampMicros>1527503513539000</timestampMicros><timePrecision>1983</timePrecision><quality>0</quality><validity>0</validity><source>0</source><value>99.9</value></compositeMeasurement>
  `
})
routes.set(`${base}/getCurrentLimit`, (ctx:Context) => {
  ctx.headers['Content-Type'] = "application/xml"
  ctx.response.body = `
<?xml version="1.0" encoding="UTF-8" standalone="yes"?><compositeMeasurement><timestampMicros>1527503668224000</timestampMicros><timePrecision>1983</timePrecision><quality>0</quality><validity>0</validity><source>0</source><value>6.0</value></compositeMeasurement>
  `
})
routes.set(`${base}/getACActivePower`, (ctx:Context) => {
  ctx.headers['Content-Type'] = "application/xml"
  ctx.response.body = `
<?xml version="1.0" encoding="UTF-8" standalone="yes"?><compositeMeasurement><timestampMicros>1527504241409000</timestampMicros><timePrecision>1983</timePrecision><quality>0</quality><validity>0</validity><source>0</source><value>42.0</value></compositeMeasurement>
  `
})
routes.set(`${base}/getAuthenticatedVehicle`, (ctx:Context) => {
  ctx.headers['Content-Type'] = "application/xml"
  ctx.response.body = `
<?xml version="1.0" encoding="UTF-8" standalone="yes"?><compositeLong><timestampMicros>0</timestampMicros><timePrecision>16</timePrecision><quality>0</quality><validity>2</validity><source>2</source><value>-9223372036854775808</value></compositeLong>
  `
})
