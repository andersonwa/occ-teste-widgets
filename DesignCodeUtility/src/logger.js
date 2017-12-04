"use strict"

const colors = require('colors/safe')

const t = require("./i18n").t

/**
 * Record that an error has occurred in an international way.
 * @param key
 * @param substitutions
 * @param captionKey - optional key for caption string
 */
function error(key, substitutions, captionKey) {
  logError(t(key, substitutions), captionKey ? t(captionKey) : undefined)
}

/**
 * Record that something has occurred in an international way.
 * @param key
 * @param substitutions
 */
function info(key, substitutions) {
  logInfo(t(key, substitutions))
}

/**
 * Record that something worrying has occurred in an international way.
 * @param key
 * @param substitutions
 */
function warn(key, substitutions) {
  logWarn(t(key, substitutions))
}

/**
 * Record that an error has occurred.
 * @param text
 * @param caption - optional
 */
function logError(text, caption) {
  console.log(colors.red.bold(text))
}

/**
 * Record that something has occurred.
 * @param text
 */
function logInfo(text) {
  console.log(text)
}

/**
 * Record that something worrying has occurred.
 * @param text
 * @param caption - optional
 */
function logWarn(text, caption) {
  console.log(colors.magenta.bold(text))
}

exports.error = error
exports.info = info
exports.warn = warn
exports.logError = logError
exports.logInfo = logInfo
exports.logWarn = logWarn
