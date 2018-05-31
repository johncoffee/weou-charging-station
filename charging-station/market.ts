import { httpRequest } from './http-request.js'

export async function getPrice():Promise<number> {
  let price:number = 200
  try {
    const res = await httpRequest('http://10.170.0.237:8090/getvar?var=price_per_kwh')
    price = parseFloat(res.body)
  }
  catch (e) {
    console.log("Failed getting price, using fallback")
    // console.error(e)
  }
  return price
}

export async function getCo2():Promise<number> {
  try {
    const res = await httpRequest('http://10.170.0.237:8090/getvar?var=local_co2')
    const co2 = parseFloat(res.body)
    return co2
  }
  catch (e) {
    console.log("Failed getting co2, using fallback")
    // console.error(e)
  }
  return -1
}
