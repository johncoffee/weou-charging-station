import Web3C from 'web3'
import { contractAddress, privateKey } from './config'
import { tokenTransfer, TokenTransfer } from './token-transfer.js'
import { TransactionReceipt } from 'web3/types.js'
import { ensureDir, writeJSON } from 'fs-extra'
import { join } from 'path'

const Web3 = require('web3')

const API_KEY = 'xSa977dElK0pyDw8ipCV'
const rpcUrl = `https://rinkeby.infura.io/${API_KEY}`
// const rpcUrl = `http://localhost:7545`

const logsDir = join('/tmp', "charging-station")
const receiptsDir = join(logsDir, "/reciepts")

const contractArtifact = require('./abi.json')
const balanceOf = 'balanceOf'

const transferAbi:object = contractArtifact.abi.find(method => method.name === "transfer")
console.assert(!!transferAbi, `should've found 'transfer'`)

const web3:Web3C = new Web3(rpcUrl)
const owner = web3.eth.accounts.privateKeyToAccount(privateKey)

const gasPrice = web3.utils.toWei("1", 'shannon')
const contract = new web3.eth.Contract(contractArtifact.abi, contractAddress, {
  gasPrice,
  from: owner.address,
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
  amount = Math.floor( amount * 10 ** decimals )
  if (amount % 1 > 0) {
    console.log(`Warning: Unhandled rest ${amount % 1} of amount ${amount}`)
  }

  console.debug(`sending ${amount} 'cents' from ${getAddress()} to ${to} ...`)

  const txs:TokenTransfer[] = [{
    amount: amount.toString(),
    gasPrice,
    contractAddress,
    networkId: 4,
    recipient: to,
  }]

  const signedTxs:string[] = await tokenTransfer(web3, txs, transferAbi, privateKey)

  await Promise.all([ensureDir(receiptsDir), ensureDir(logsDir)])

  const sendPromises:Promise<TransactionReceipt>[] = signedTxs.map(signedTx => web3.eth.sendSignedTransaction(signedTx))

  sendPromises.forEach(p => p
    .catch(error => writeJSON(join(logsDir, `${new Date().toJSON()}-${amount}-error.json`), error, {spaces: 2})))

  const fsWritePromises = sendPromises
    .map(p => p
      .then(receipt => writeJSON(join(receiptsDir, `${receipt.blockNumber}-${receipt.transactionHash}.json`), receipt, {spaces: 2}),
            error => writeJSON(join(logsDir, `${new Date().toJSON()}-${amount}-error.json`), error, {spaces: 2}))
    )

  Promise.all(fsWritePromises).then(results => {
    console.log(`Done writing ${results.length} receipts to ${receiptsDir}`)
  })
}

async function test (target:string):Promise<void> {
  console.log(`owner ${getAddress()}`)
  console.log(`owners balance ${await getBalanceOf(getAddress())}`)
  console.log(`token contract address ${contractAddress}`)

  try {
    const bal = await getBalanceOf(target)
    console.debug('balance of '+target,bal)
    await transfer(target,  .5 + Math.random() * 1.5)
  }
  catch (e) {
    console.error(e)
  }
  // getBalanceOf('0x6C041FB1E17Aa0e95af5b078C45c7397fe3cAA0b')
  //   .then(val => console.log(val))
}

if (!module.parent) {
    test(process.argv[2])
    // test('0x51f8A5d539582EB9bF2F71F66BCC0E6B37Abb7cA' || process.argv[2])
}
