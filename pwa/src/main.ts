import { init as statusInit } from './status.js'

export function init() {
  statusInit()
}
export async function doRequest (method: "start"|"status"|"stop") {
  const baseUrl = new URL(getValue('[name=charging-station-backend]'))
  baseUrl.pathname += method
  let urlStateful = baseUrl + `?` + getUrlParameters()
  const res = await fetch(urlStateful, {
    mode: 'cors',
    cache: 'no-cache',
  })
  let json = {}
  if (res.headers.has('content-type') && res.headers.get('content-type').indexOf('application/json') > -1) {
    json = await res.json()
  }
  return json
}

function getUrlParameters():string {
  return [
    "id=" + encodeURIComponent(getValue('[name=charging-station-id]')),
    "url="+encodeURIComponent(getValue('[name=charging-station-url]')),
    "return="+encodeURIComponent(getValue('[name=return-funds]')),
  ]
  .join("&")
}

function getValue(selector:string):string {
  return (document.querySelector(selector) as HTMLInputElement).value
}

export function setValue(selector:string, value:string):string {
  return (document.querySelector(selector) as HTMLInputElement).value = value
}
