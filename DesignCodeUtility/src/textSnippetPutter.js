const endPointTransceiver = require("./endPointTransceiver")
const eTagFor = require("./etags").eTagFor
const warn = require("./logger").warn
const processPutResultAndEtag = require("./putterUtils").processPutResultAndEtag
const readJsonFile = require("./utils").readJsonFile
const request = require("./requestBuilder").request

/**
 * Send the supplied global text snippet file back to the server.
 * @param path
 */
function putGlobalSnippets(path) {

  // Make sure the server has the endpoint we need. An old server may not.
  if (!endPointTransceiver.serverSupports("updateCustomTranslations")) {
    warn("textSnippetsCannotBeSent", {path})
    return
  }

  // Get the locale from the path.
  const tokens = path.split("/")
  const locale = tokens[tokens.length - 2]

  // Start to build up the payload.
  const payload = {
    "custom" : {}
  }

  // Walk through the JSON, extracting keys and values.
  const contents = readJsonFile(path)
  Object.keys(contents).forEach((outerKey) =>
      Object.keys(contents[outerKey]).forEach((innerKey) =>
        payload.custom[innerKey] = contents[outerKey][innerKey]))

  return endPointTransceiver.updateCustomTranslations(["ns.common"],
    request().withLocale(locale).withBody(payload).withEtag(eTagFor(path))).tap(
    (results) => processPutResultAndEtag(path, results))
}

exports.putGlobalSnippets = putGlobalSnippets
