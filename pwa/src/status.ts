import { html, render } from '../node_modules/lit-html/lit-html.js'
import { doRequest, setValue } from './main.js'

async function poll (delay:number = 1) {
  let json
  try {
    json = await doRequest('status')
  }
  catch (e) {
    console.error(e)
    delay = Math.min(30, delay + 5)
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
    kW: -1,
    kWhTotal: -1,
  })
  poll()
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
    <div class="small-12 cell">
       <h5 class="margin-0 subheader">Wattage</h5>
       <h2 class="text-center margin-0">${state.kW} <span class="subheader">kW</span></h2>     
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
  <p><button class="button expanded large primary charging-controls__start ${state.kW == 0 ? 'hide' : ''}">START</button></p>
`
  render(template,   document.querySelector('charging-status'))

  const startBtn = (document.querySelector('.charging-controls__start') as HTMLButtonElement)
  startBtn.disabled = (state.balance === 0)

  document.querySelector('.charging-controls__start').addEventListener('click', async (evt) => {
    startBtn.disabled = true
    await doRequest('start')
    await poll(0)
    startBtn.disabled = false
  })

  // document.querySelector('.charging-controls__stop').addEventListener('click', async (evt) => {
  //   const btn = (evt.target as HTMLButtonElement)
  //   btn.disabled = true
  //   await doRequest('stop')
  //   await poll(0)
  //   btn.disabled = false
  // })
}

interface State {
  co2:number
  price:number
  balance:number
  kW:number
  kWhTotal:number
}

async function wait (delay:number) {
  return new Promise(resolve => setTimeout(()=> resolve(), delay * 1000))
}
