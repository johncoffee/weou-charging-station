import Web3C from 'web3'
import { EncodedTransaction, TransactionObject, TransactionReceipt, Tx } from 'web3/types.js'
import { contractAddress, privateKey } from './config'

const Web3 = require('web3')

const API_KEY = 'xSa977dElK0pyDw8ipCV'
const rpcUrl = `https://rinkeby.infura.io/${API_KEY}`
// const rpcUrl = `http://localhost:7545`

const contractArtifact = require('./abi.json')
const balanceOf = 'balanceOf'

const web3:Web3C = new Web3(rpcUrl)
const owner = web3.eth.accounts.privateKeyToAccount(privateKey)

let gasPrice = web3.utils.toWei("1", 'shannon')
const contract = new web3.eth.Contract(contractArtifact.abi, contractAddress, {
  gasPrice,
  from: owner.address
})

export function getAddress () {
  return owner.address
}

export async function getBalanceOf(target:string):Promise<number> {
  const decimals = await contract.methods.decimals().call()
  const res = await contract.methods[balanceOf](target).call()
  const balance = Math.floor( res / 10 ** decimals )
  return balance
}

export async function transfer(to:string, amount:number):Promise<any> {
  const decimals = await contract.methods.decimals().call()
  amount = amount * 10 ** decimals
  console.assert(!!contract.methods.transfer, `transfer not found in `,Object.keys(contract.methods))
  // await (web3 as any).eth.personal.unlockAccount(owner.address as any)
  // console.debug(3)
  // const res = await contract.methods.transfer(to, amount).send()
  // return res
  console.debug(`Would have sent ${amount} from ${getAddress()} to ${to}`)
}

async function test (target:string):Promise<void> {
  console.log(`owner ${getAddress()}`)
  // console.log(`owners balance ${await getBalanceOf(getAddress())}`)
  console.log(`token contract address ${contractAddress}`)

  try {
    const bal = await getBalanceOf(target)
    console.debug('balance of '+target,bal)
    const success = await transfer(target,  100)
    console.debug(success)
  }
  catch (e) {
    console.error(e)
  }
  // getBalanceOf('0x6C041FB1E17Aa0e95af5b078C45c7397fe3cAA0b')
  //   .then(val => console.log(val))
}

if (!module.parent) {
    test(process.argv[2])
}
