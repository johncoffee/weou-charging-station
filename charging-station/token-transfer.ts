import Web3C from 'web3'
import { Account, EncodedTransaction, Tx } from 'web3/types.js'

export interface TokenTransfer {
  networkId: 1 | 4 | 42 | 1337,
  recipient: string
  contractAddress: string,
  amount: string,
  gasPrice: string,
}

export async function tokenTransfer(web3:Web3C, transferOrders:TokenTransfer[], transferAbi:object, owner:string|Account):Promise<string[]> {
  if (typeof owner === 'string') {
    owner = web3.eth.accounts.privateKeyToAccount(owner)
  }
  const account:Account = owner


  //console.debug(transferOrders[0].gasPrice)
  let txs:Tx[] = transferOrders
    .map( (input:TokenTransfer) => {
      // data field
      const amount = input.amount
      const data:string = web3.eth.abi.encodeFunctionCall(transferAbi, [
        input.recipient,
        amount,
      ])

      const tx:Tx = <Tx>{
        to: input.contractAddress,
        gasPrice: input.gasPrice,
        data: data,
      }

      const gas = '52000'
      tx.gas = gas

      return tx
    })

  const toSignPromises:EncodedTransaction[] = txs.map(tx => (account as any).signTransaction(tx)) // it cant find signTransaction
  const serializedSignedTxs:string[] = (await Promise.all(toSignPromises)).map(encTx => encTx.raw || (encTx as any).rawTransaction) // dunno which is future-proof

  return serializedSignedTxs
}

// alternative also working:
// const toSignPromises = txs
//   .map(tx => web3.eth.accounts.signTransaction(tx, privateKey, false))
// const serializedSignedTxs = await Promise.all(toSignPromises as any)
// const = serializedSignedTxs.map((serializedSignedTx:any) => { // serializedSignedTx is missing typings
//   return serializedSignedTx.rawTransaction
// })
