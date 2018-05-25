import { init as statusInit } from './status.js'

export function init() {
  statusInit()
}

const apiUrl = 'http://chargingstation:3000/'

export async function doRequest (method: "start"|"status"|"stop", id:string) {
  const res = await fetch(apiUrl + method + `?id=${id}`, {
    mode: 'cors',
    cache: 'no-cache',
  })
  let json = {}
  if (res.headers.has('content-type') && res.headers.get('content-type').indexOf('application/json') > -1) {
    json = await res.json()
  }
  return json
}
