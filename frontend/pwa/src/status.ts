import { html, render } from '../node_modules/lit-html/src/lit-html.js'
import { doRequest } from './main.js'

const delay = 3 * 1000

async function poll (loop:boolean) {
  let json
  try {
    json = await doRequest('status', (document.querySelector('.charging-station-id') as HTMLInputElement).value)
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
  let q = location.search
  q = q.substr( q.indexOf("id=")+3 )

  const input:HTMLInputElement = document.querySelector('input')
  input.value = q

  update({
    co2: -1,
    price: -1,
    balance: -1,
    charging: false,
    connected: false,
  })
  poll(true)
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
    await doRequest('start', (document.querySelector('.charging-station-id') as HTMLInputElement).value)
    await poll(false)
    startBtn.disabled = false
  })

  document.querySelector('.charging-controls__stop').addEventListener('click', async (evt) => {
    const btn = (evt.target as HTMLButtonElement)
    btn.disabled = true
    await doRequest('stop', (document.querySelector('.charging-station-id') as HTMLInputElement).value)
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

