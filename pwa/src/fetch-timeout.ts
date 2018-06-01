export default function fetchWrapper(url:string, options:RequestInit, timeout:number = 5):Promise<Response> {
  return new Promise((resolve, reject) => {
    fetch(url, options)
      .then(resolve)
      .catch(reject)

    if (timeout) {
      const e = new Error("Connection was discarded after "+timeout + " s")
      setTimeout(reject, timeout * 1000, e)
    }
  })
}