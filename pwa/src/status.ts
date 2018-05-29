import { html, render } from '../node_modules/lit-html/lit-html.js'
import { doRequest } from './main.js'

const delay = 3 * 1000

async function poll (loop:boolean) {
  let json
  try {
    json = await doRequest('status')
  }
  catch (e) {
    loop = false
    console.error(e)
    console.error("Stopped polling")
  }

  if (json) {
    update(json as State)
  }

  if (loop) {
    setTimeout(() => poll(loop), delay)
  }
}

export function init() {

  const id = getQueryVariable('id')
  if (id) {
    document.querySelector('[name="charging-station-id"').setAttribute('value', id)
  }
  const url = getQueryVariable('url')
  if (url) {
    document.querySelector('[name="charging-station-url"').setAttribute('value', url)
  }

  // initial render
  update({
    co2: -1,
    price: -1,
    balance: -1,
    charging: false,
    connected: false,
  })
  poll(true)
}

export function getQueryVariable(variable:string):string|undefined {
  const query = window.location.search.substring(1)
  let vars = query.split('&')
  for (let i = 0; i < vars.length; i++) {
    const pair = vars[i].split('=')
    if (decodeURIComponent(pair[0]) == variable) {
      return decodeURIComponent(pair[1])
    }
  }
}

function update (state:State) {
  const template = html`
  <div>
    <p>CO2/kWh: ${state.co2}</p>
    <p>Price: ${state.price} SVLN = 1 kWh</p>
    <p>Balance on the station: <span>${state.balance}</span> SVLN
    
    <p>
      <button class="button expanded large secondary">
        ${!state.connected ? "CONNECT CAR" :
           state.charging ? 'CHARGING' : '' }      
      </button>
  </div>
  
  <button class="button expanded large primary charging-controls__start ${state.charging ? 'hide' : ''}">START</button>
  <button class="button expanded large secondary charging-controls__stop ${state.charging ? '' : 'hide'}">STOP</button>
`
  render(template,   document.querySelector('charging-status'))

  const startBtn = (document.querySelector('.charging-controls__start') as HTMLButtonElement)
  startBtn.disabled = (state.balance === 0)

  document.querySelector('.charging-controls__start').addEventListener('click', async (evt) => {
    startBtn.disabled = true
    await doRequest('start')
    await poll(false)
    startBtn.disabled = false
  })

  document.querySelector('.charging-controls__stop').addEventListener('click', async (evt) => {
    const btn = (evt.target as HTMLButtonElement)
    btn.disabled = true
    await doRequest('stop')
    await poll(false)
    btn.disabled = false

  })
}

interface State {
  co2:number
  price:number
  balance:number
  charging:boolean
  connected:boolean
}

