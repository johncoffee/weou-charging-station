import { init as statusInit } from './status.js'

export function init() {
  statusInit()
}

const apiUrl = 'http://localhost:3000/'

export async function doRequest (method: "start"|"status"|"stop") {
  console.debug(getUrlParameters())
  const res = await fetch(apiUrl + method + `?` + getUrlParameters(), {
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
    "id=" + encodeURIComponent(document.querySelector('[name=charging-station-id]').getAttribute('value')),
    "url="+encodeURIComponent(document.querySelector('[name=charging-station-url]').getAttribute('value')),
    "return="+encodeURIComponent(document.querySelector('[name=return-funds]').getAttribute('value')),
  ]
  .join("&")
}
