"use strict"

const osLocale = require('os-locale')
const Promise = require("bluebird")

const logError = require("./logger").logError
const i18n = require("./i18n")
const makePromisingClient = require("./promisingClient").makePromisingClient
const request = require("./requestBuilder").request

const self = this

/**
 * Module that knows how to talk to Commerce Cloud endpoints.
 */

/**
 * Set up the module.
 * @param instance e.g. http://localhost:9080
 * @param userName
 * @param password
 * @param locale defaults to server locale if none is provided
 * @param
 * @return a Bluebird promise that fires when the initialization has happened.
 */
exports.init = function (instance, userName, password, overrideLocale, allLocales) {

  self.instance = instance
  self.userName = userName
  self.password = password

  // Set up an augmented version of node-rest-client.
  self.client = makePromisingClient()

  // Do the necessary server related set up.
  return setUpFromMetaData(overrideLocale, allLocales)
}

/**
 * This method can be used when you have a fully qualified URL such as a URL
 * that was returned in a previous response.
 * @param url
 */
exports.get = function (url) {

  // Now login and call the method returning a promise that we pass back to the caller.
  return login().then((results) => {

    // Find the OAUTH token header so we can re-use it.
    const authHeader = results.response.headers['set-cookie'].find(
      (cookieHeader) => cookieHeader.startsWith("FILE_OAUTH_TOKEN"))

    // Pass the FILE_OAUTH_TOKEN cookie from the header then call the node-rest-client method.
    return self.client.getAndPromise(url, request().withHeader("Cookie", authHeader))
  })
}

// Make this available to caller in case they need to fashion their own URLs.
exports.urlBase = "/ccadminui/v1/"

/**
 * Used to determine if the server supports all the supplied operations.
 * @param list of operations as strings
 * @return true if it does; false o/w.
 */
exports.serverSupports = function () {

  return Array.from(arguments).every((operation) => exports[operation])
}

/**
 * Does the locale setup dance.
 * @param allLocales
 * @param results
 * @param overrideLocale
 */
function processLocaleInformation(allLocales, localeData, overrideLocale) {

// Save off all available locales if we are trying for them all.
  if (allLocales) {
    exports.locales = localeData.items
  } else {

    // See if we want a specific locale - find it in the response data.
    if (overrideLocale) {

      // Look for a match in the supported locales.
      const match = localeData.items.find((locale) => locale.name == overrideLocale)

      if (match) {
        exports.locales = [match]
      } else {
        const localeIsNotRecognized = i18n.t("localeIsNotRecognized", {name : overrideLocale})
        logError(localeIsNotRecognized)
        throw new Error(localeIsNotRecognized)
      }
    } else {

      // Otherwise, for quickness just use the server locale in a single element array.
      exports.locales = [localeData.defaultLocale]
    }
  }

  // Save off the server default locale for later use unless the user is forcing us to use a different one.
  exports.locale = overrideLocale ? overrideLocale : localeData.defaultLocale.name

  // Now we are decided on locale, tell the i18n module.
  i18n.init(exports.locale)
}

/**
 * After doing a sanity check, get the the supported locales from the server.
 * @returns A Bluebird promise.
 */
function getLocales() {

  if (exports.listLocales) {

    // Next find out what locales we have.
    return exports.listLocales()
  } else {

    const notAdminInterface = i18n.t("notAdministrationInterface", {name : self.instance})
    logError(notAdminInterface, i18n.t("invalidOperation"))
    throw notAdminInterface
  }
}

/**
 * Using the registry information, create a convenience function for each supported endpoint.
 * @param results
 */
function createEndPointFunctions(results) {

  for (let endpointName in results.data.endpointMap) {
    exports[endpointName] =
      (parameter1, parameter2) => callEndPoint(results.data.endpointMap[endpointName], parameter1, parameter2)
  }
}

/**
 * Turn the registry information into useful functions that return a promise.
 * @param overrideLocale supplied if we dont want to use the server locale.
 * @param allLocales set to true if we want to pull everything down for every locale.
 * @returns a promise so we know when the registry data has arrived.
 */
function setUpFromMetaData(overrideLocale, allLocales) {

  // Set a temporary locale for now.
  exports.locale = osLocale.sync()

  return login().then((response, data) => {
    return self.client.getAndPromise(pathFor(`${exports.urlBase}registry`), request().build(response.access_token))
  }).catch(error => logError(error)).then(
    (results) => {

      // Create methods to match each of the available endpoints.
      createEndPointFunctions(results)

      // Take a note of the CC version for later.
      exports.commerceCloudVersion = results.response.headers["oraclecommercecloud-version"]

      // Make sure we are not pointing at a store server by mistake.
      return getLocales()

      // There is a bunch of setup around locales depending on what the user wants to do.
    }).tap((results) => processLocaleInformation(allLocales, results.data, overrideLocale))
}

/**
 * Figure out what sorts of parameters we got.
 * @param parameter1 - can either be a URL (with optional query string), a query string, an array of keys or a RequestBuilder object or not supplied.
 * @param parameter2 - can be a RequestBuilder object or not supplied
 * @returns a structure containing the identified values.
 */
function unpack(parameter1, parameter2) {

  const unpacked = {}

  if (parameter1) {

    unpacked.pathParams = parameter1 instanceof Array ? parameter1 : null
    unpacked.urlAndOrQueryString = typeof parameter1 === "string" ? parameter1 : null
    unpacked.responseBuilder = typeof parameter1 === "object" && !parameter1 instanceof Array ? parameter1 : null

    if (parameter2) {
      typeof parameter2 === "string" && (unpacked.urlAndOrQueryString = parameter2)
      typeof parameter2 === "object" && (unpacked.responseBuilder = parameter2)
    }
  }

  // If no RequestBuilder was used, set up a default one.
  if (!unpacked.responseBuilder) {
    unpacked.responseBuilder = request()
  }

  return unpacked
}

/**
 * Used internally to call the endpoint.
 * @param endPointInformation - taken from the registry call
 * @param parameter1 - can either be an array of key strings, a query string starting with ? or a URL or a node-rest-client args object or not supplied.
 * @param parameter2 - must be either a node-rest-client args object or not supplied.
 * @returns a promise of Bluebirds...
 */
function callEndPoint(endPointInformation, parameter1, parameter2) {

  // Unpack the parameters (if any).
  const parameters = unpack(parameter1, parameter2)

  // Find the match method on the node-rest-client instance.
  const methodToCall = self.client[`${endPointInformation.method.toLowerCase()}AndPromise`]

  // Now login and call the method returning a promise that we pass back to the caller.
  return login().then((results) =>
    methodToCall(pathFor(endPointInformation.url, parameters.pathParams, parameters.urlAndOrQueryString),
      parameters.responseBuilder.build(results.data.access_token, endPointInformation)))
}

/**
 * Turn the relative path into a fully qualified URL.
 * @returns the full URL e.g.http://localhost:9080/ccadminui/v1/login/
 * @param urlTemplate which was returned from the registry.
 * @param pathParams and optional array of params to be substituted into the URL template.
 * @param urlAndOrQueryString
 */
function pathFor(urlTemplate, pathParams, urlAndOrQueryString) {

  // See if its a full URL - which trumps everything.
  if (urlAndOrQueryString && !urlAndOrQueryString.startsWith("?")) {

    // Just prepend the server and return.
    return `${self.instance}${urlAndOrQueryString}`
  }

  // Start work on the template.
  let finalUrl = urlTemplate

  // Add in any substitution parameters.
  if (pathParams) {
    pathParams.forEach((param) => {
      finalUrl = finalUrl.replace("{}", param)
    })
  }

  // See if there is a query string to go on the end.
  if (urlAndOrQueryString && urlAndOrQueryString.startsWith("?")) {
    finalUrl += urlAndOrQueryString
  }

  return `${self.instance}${finalUrl}`
}

/**
 * Log into the server, passing the response via a promise - unless we are already logged in.
 * @return a Bluebird promise.
 */
const login = Promise.method(function () {

  // See if we have logged in before.
  if (self.loginData) {

    // See if the login data is getting a bit old.
    if (self.lastLogin && (Date.now() - self.lastLogin > 15000)) {

      return getAndStoreLoginData()
    } else {

      // Already logged in.
      return self.loginData
    }
  } else {
    // First time - need to log in.
    return getAndStoreLoginData()
  }
})

/**
 * Log in and save off the access token.
 * @returns A BlueBird promise
 */
function getAndStoreLoginData() {

  // Keep track of the time we logged in.
  self.lastLogin = Date.now()

  // Cache the login response for later reuse.
  return self.client.postAndPromise(pathFor(`${exports.urlBase}login/`),
    {
      data : `grant_type=password&username=${self.userName}&password=${self.password}`,
      headers : {"Content-Type" : "application/x-www-form-urlencoded; charset=UTF-8"}
    }).tap((loginData) => self.loginData = loginData)
}
