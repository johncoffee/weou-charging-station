import { httpRequest } from './http-request.js'

const marketBaseUrl = process.env.MARKET || 'http://10.170.0.237:8090'
console.log(`market at ${marketBaseUrl}`)

export async function getPrice():Promise<number> {
  let price:number = 250
  try {
    const res = await httpRequest(`${marketBaseUrl}/getvar?var=price_per_kwh`)
    price = parseFloat(res.body)
  }
  catch (e) {
    // console.log("Failed getting price, using fallback")
    // console.error(e)
  }
  return price
}

export async function getCo2():Promise<number> {
  try {
    const res = await httpRequest(`${marketBaseUrl}/getvar?var=local_co2`)
    const co2 = parseFloat(res.body)
    return co2
  }
  catch (e) {
    // console.log("Failed getting co2, using fallback")
    // console.error(e)
  }
  return -1
}
