import Web3C from 'web3'
import { EncodedTransaction, TransactionObject, TransactionReceipt, Tx } from 'web3/types.js'
import { contractAddress, privateKey } from './config'

const Web3 = require('web3')

const API_KEY = 'xSa977dElK0pyDw8ipCV'
const rpcUrl = `https://rinkeby.infura.io/${API_KEY}`
// const rpcUrl = `http://localhost:7545`

const contractArtifact = require('./abi.json')
const balanceOf = 'balanceOf'
const mintAbi = contractArtifact.abi.find((method:any) => method.name === balanceOf)
console.assert(!!mintAbi, `Should've found ${balanceOf} in `, contractArtifact.abi)

const web3:Web3C = new Web3(rpcUrl)

let gasPrice = web3.utils.toWei("2", 'shannon')

export function getAddress () {
  const owner = web3.eth.accounts.privateKeyToAccount(privateKey)
  return owner.address
}

let _balance:number = -1

export async function getBalanceOf(target:string):Promise<number> {
  if (_balance > -1) {
    return _balance
  }

  const contract = new web3.eth.Contract(contractArtifact.abi, contractAddress, {
    gasPrice
  })

  const decimals = await contract.methods.decimals().call()
  const res = await contract.methods[balanceOf](target).call()
  const balance = res / decimals ** 10
  _balance = balance
  return balance
}

export async function transferFrom(from:string, to:string, amount:number):Promise<any> {
  const contract = new web3.eth.Contract(contractArtifact.abi, contractAddress, {
    gasPrice
  })
  const res = await contract.methods.transferFrom(from, to, amount).call()
  return res
}

async function main (target:string):Promise<void> {
  console.log(`token contract address ${contractAddress}`)
  console.log(`from ${getAddress()}`)
  getBalanceOf(target)
    .then(val => console.log(val))
}

if (!module.parent) {
  console.assert(process.argv[2])
  try {
    main(process.argv[2])
  }
  catch (e) {
    console.error(e)
  }
}
