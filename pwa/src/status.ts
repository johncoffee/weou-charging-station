import { html, render } from '../node_modules/lit-html/lit-html.js'
import { doRequest, setValue } from './main.js'

async function poll (delay:number = 1) {
  let json
  try {
    json = await doRequest('status')
  }
  catch (e) {
    console.error(e)
    delay = Math.min(5, delay + 5)
    console.log(`Trouble getting status, waiting ${delay} s before retrying`)
  }

  if (json) {
    update(json as State)
  }

  if (delay > 0) {
    await wait(delay)
    poll(delay)
  }
}

async function onStartClick (evt:Event)  {
  const startBtn = evt.target as HTMLButtonElement
  startBtn.disabled = true
  try {
    await doRequest('start')
    await poll(0)
  }
  catch (e) {
    console.error(e)
  }
  finally {
    startBtn.disabled = false
  }
}

export function init() {

  const id = getQueryVariable('id')
  if (id) {
    setValue('[name=charging-station-id', id)
  }
  const url = getQueryVariable('url')
  if (url) {
    setValue('[name=charging-station-url', url)
  }
  const backend = getQueryVariable('backend')
  if (backend) {
    setValue('[name=charging-station-backend', backend)
  }

  // initial render
  update({
    co2: -1,
    price: -1,
    balance: -1,
    cable: -1,
    kW: -1,
    kWhTotal: -1,
  })

  // paranoia
  document.querySelector('.charging-controls__start').removeEventListener('click', onStartClick)
  document.querySelector('.charging-controls__start').addEventListener('click', onStartClick)

  poll(1.5)
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

  <div class="grid-x grid-margin-x grid-padding-x grid-margin-y grid-padding-y coloured-cells">
    <div class="small-6 cell">
       <h5 class="margin-0 subheader">Wattage</h5>
       <h2 class="text-center margin-0">${state.kW} <span class="subheader">kW</span></h2>     
    </div>
    <div class="small-6 cell">
       <h5 class="margin-0 subheader">Cable</h5>
       <h2 class="text-center margin-0">${state.cable == -1 ? "-1" : state.cable == 1 ? 'unplugged' : "connected"}</h2>     
    </div>    
    <div class="small-6 cell">
      <h5 class="margin-0 subheader">Price</h5>
      <h2 class="text-center margin-0">${state.price} <span class="subheader">Svalin/kW</span></h2>
    </div>
    <div class="small-6 cell">
      <h5 class="margin-0 subheader">Balance</h5>
      <h2 class="text-center margin-0">${state.balance} <span class="subheader">Svalin</span></h2>
    </div>     
  </div>
    
  <p class="margin-1"></p> 
  <p><button class="button expanded large primary charging-controls__start">START</button></p>
`
  render(template,   document.querySelector('charging-status'))
}

interface State {
  co2:number
  price:number
  balance:number
  kW:number
  kWhTotal:number
  cable:number
}

function wait (delay:number) {
  return new Promise(resolve => setTimeout(()=> resolve(), delay * 1000))
}
