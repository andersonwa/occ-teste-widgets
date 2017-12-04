"use strict"

// Basic English strings will always be there.
let strings = require(`./locales/en/strings.json`)

// Try to load strings for the OS locale to begin with. These will be overwritten later.
try {
  // We use hyphens where the OS uses underscores.
  const osLocale = require('os-locale').sync().replace("_", "-")
  strings = require(`./locales/${osLocale}/strings.json`)
} catch (e) {
  // Silently swallow this error.
}

/**
 * Set up the module based on the supplied locale.
 * @param locale
 */
function init(locale) {

  try {
    // Try to get strings for the supplied locale.
    strings = require(`./locales/${locale}/strings.json`)
  } catch (e) {
    // If that fails, just use en. This should not normally happen.
    console.log(`No strings found for ${locale} !`)
  }
}

/**
 * Process substitution parameters contained in the supplied text.
 * @param text
 * @param substitutions
 * @returns a transformed string
 */
function transform(text, substitutions) {

  // Walk through the keys substituting them in the string.
  return Object.keys(substitutions).reduce(
    (transformedText, currentValue) => transformedText.replace(`__${currentValue}__`, substitutions[currentValue]), text)
}

/**
 * Get the locale string for the supplied key. Any substitution variables can be supplied as name/value pairs.
 * @param key
 * @param substitutions
 */
function t(key, substitutions) {

  // Find the text for the key.
  const text = strings.resources[key]

  // Check in case we did not find any - this should never happen.
  if (!text) {
    return `No text for found for ${key} !`
  }

  // See if we need to mess the text around further.
  return substitutions ? transform(text, substitutions) : text
}

exports.init = init
exports.t = t
