import { httpRequest } from './http-request.js'

export async function getPrice():Promise<number> {
  let price:number = 200
  try {
    const res = await httpRequest('http://hub:8000/getvar?var=price_per_kwh')
    price = parseFloat(res.body)
  }
  catch (e) {
    console.error(e)
  }
  return price
}

export async function getCo2():Promise<number> {
  try {
    const res = await httpRequest('http://hub:8000/getvar?var=local_co2')
    const co2 = parseFloat(res.body)
    return co2
  }
  catch (e) {
    console.error(e)
  }
  return -1
}
