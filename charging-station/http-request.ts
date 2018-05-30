import { IncomingMessage, request, RequestOptions } from 'http'
import { URL } from 'url'

export function httpRequest (urlString:string, opts:RequestOptions = {}):Promise<ParsedIncomingMessage> {
  return new Promise((resolve, reject) => {
    const urlObj = new URL(urlString)
    let data:string = ''
    if (opts.method) {
      (urlObj as any).method = opts.method
    }
    let req = request(urlObj, res => {
      const result = <ParsedIncomingMessage>{
        statusCode: res.statusCode,
        headers: res.headers,
      }
      res.setEncoding('utf8')
      res.on('data', chunk => data += chunk.toString())
      res.on('end', () => {
        if (/^application\/json/.test(res.headers['content-type'])) {
          try {
            result.json = JSON.parse(data)
          }
          catch (e) {
            result.error = new Error(e.toString())
          }
        }
        result.body = data
        if (result.error) {
          reject(result)
        }
        else {
          resolve(result)
        }
      })
    })
    req.on('error', err => reject(err))
    req.setTimeout( (opts.timeout) ? opts.timeout : 5000)
    req.end() // send it off!
    console.log(`${new Date().toJSON()} ${urlObj}`)
  })
}

type Response = {
  body: any,
  error: Error,
  json: any,
}

export type ParsedIncomingMessage = IncomingMessage & Response