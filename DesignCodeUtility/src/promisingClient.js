const Promise = require("bluebird")
const Client = require("node-rest-client").Client

/**
 * Create the node-rest-client instance and augment it to work with Bluebird promises.
 * @param client
 */
exports.makePromisingClient = function () {

  // Create an instance of the basic node-rest-client first.
  const client = new Client()

  // Walk through each of the HTTP verb methods.
  const methodNames = ["post", "get", "put", "delete"]
  methodNames.forEach(methodName => {

    // Create another version of the current function with returns a promise.
    client[methodName + "AndPromise"] = (url, args) => {
      return new Promise((resolve, reject) => {
        try {
          // Call the original function which needs a callback.
          client[methodName](url, args, (data, response) => {
            // If get in here, it looks like the call has worked, treat self as success for promise purposes.
            resolve({data, response})
          })
        } catch (error) {
          // Something went wrong - break the promise.
          reject(error)
        }
      })
    }
  })

  return client
}
