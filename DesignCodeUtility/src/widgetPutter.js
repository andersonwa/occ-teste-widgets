"use strict"

const basename = require('path').basename

const cacheWidgetInstances = require("./metadata").cacheWidgetInstances
const constants = require("./constants").constants
const endPointTransceiver = require("./endPointTransceiver")
const inTransferMode = require("./metadata").inTransferMode
const processPutResultAndEtag = require("./putterUtils").processPutResultAndEtag
const readFile = require("./utils").readFile
const readMetadata = require("./metadata").readMetadata
const readMetadataFromDisk = require("./metadata").readMetadataFromDisk
const request = require("./requestBuilder").request
const warn = require("./logger").warn

/**
 * Do the needful to get the supplied template back to the server.
 * @param path
 * @return
 */
function putWidgetInstanceTemplate(path) {
  return getWidgetAndWidgetInstanceMetadata(path).then(
    (metadata) => {
      if (metadata)
        return putWidgetInstanceFile(metadata, path, "updateWidgetSourceCode")
    }
  )
}

/**
 * Web content instance templates are a bit special so we handle them here.
 * @param metadata
 * @param path
 * @returns A Bluebird promise.
 */
function putWebContentWidgetInstanceTemplate(path) {

  // Need the metadata first.
  return getWidgetAndWidgetInstanceMetadata(path).then(
    (metadata) => {

      // Get the name and notes first so we don't overwrite these.
      if (metadata) {
        return endPointTransceiver.getWidget([metadata.instance.repositoryId]).then(
          (results) => {

            // Build up the payload, using some data from the server.
            const payload = {
              widgetConfig : {
                name : results.data.name,
                notes : results.data.notes
              },
              content : readFile(path)
            }

            return endPointTransceiver.updateWidgetWebContent(
              [metadata.instance.repositoryId], request().withBody(payload).withEtag(metadata.etag)).tap(
              (results) => processPutResultAndEtag(path, results))
          }
        )
      }
    }
  )
}

/**
 * Send a widget JavaScript file back up to the server.
 * @param path
 * @returns A BlueBird promise.
 */
function putWidgetJavaScript(path) {

  // Get the base metadata for the widget.
  return readMetadata(path, constants.widgetMetadataJson).then(
    (metadata) => {

      if (metadata) {
        // Call the endpoint, passing in the widget ID and the base file name of the .js file.
        return endPointTransceiver.updateWidgetDescriptorJavascript(
          [metadata.repositoryId, basename(path)], request().fromPathAs(path, "source").withEtag(metadata.etag)).tap(
          (results) => processPutResultAndEtag(path, results))
      }
    }
  )
}

/**
 * Do the needful to get the supplied widget instance less back on the server.
 * @param path
 */
function putWidgetInstanceLess(path) {

  return getWidgetAndWidgetInstanceMetadata(path).then(
    (metadata) => {
      if (metadata) {
        return putWidgetInstanceFile(metadata, path, "updateWidgetLess", true)
      }
    }
  )
}

/**
 * Send the text snippets for the widget instance back to the server.
 * @param path
 * @returns a BlueBird promise.
 */
function putWidgetInstanceSnippets(path) {

  // Get the metadata.
  return getWidgetAndWidgetInstanceMetadata(path).then(
    (metadata) => {

      if (metadata) {

        // Get the locale from the path.
        const tokens = path.split("/")
        const locale = tokens[tokens.length - 2]

        return endPointTransceiver.updateWidgetCustomTranslations(
          [metadata.instance.repositoryId],
          request().withLocale(locale).fromPathAsJSON(path, "custom")).tap(
            (results) => processPutResultAndEtag(path, results))
      }
    }
  )
}

/**
 * Holds the boilerplate associated with getting a widget instance file back on the server.
 * @param metadata
 * @param path
 * @param endpoint
 * @param transform
 * @returns A Bluebird promise
 */
function putWidgetInstanceFile(metadata, path, endpoint, transform) {

  // Build the basic body.
  const body = request().fromPathAs(path, "source").withEtag(metadata.etag)

  // See if we need to transform the contents before sending.
  if (transform) {

    // Replace the substitution value in the file with the IDs on the target system.
    body.replacing(constants.widgetInstanceSubstitutionValue,
      `#${metadata.instance.descriptorRepositoryId}-${metadata.instance.repositoryId}`)
  }

  return endPointTransceiver[endpoint]([metadata.instance.repositoryId], body).tap(
    (results) => processPutResultAndEtag(path, results))
}

/**
 * Try to get the metadata for a widget instance - by hook or by crook.
 * @param path
 * @param widgetMetadata
 * @returns A BlueBird promise.
 */
function getWidgetInstanceMetadata(path, widgetMetadata) {

  // Load the metadata for the widget instance.
  return readMetadata(path, constants.widgetInstanceMetadataJson).then(
    (widgetInstanceMetadata) => {

      if (widgetInstanceMetadata) {

        widgetMetadata.instance = widgetInstanceMetadata
        return widgetMetadata

        // We are in transfer mode and have a widget but no instance. Create the instance, then load the metadata.
      } else if (inTransferMode()) {

        warn("creatingWidgetInstance", {path : path})

        return createMatchingWidgetInstance(widgetMetadata, path).then(
          () => {

            // Now the instance exists, can load the metadata,
            return readMetadata(path, constants.widgetInstanceMetadataJson).then(
              (widgetInstanceMetadata) => {

                widgetMetadata.instance = widgetInstanceMetadata
                return widgetMetadata
              })
          }
        )
      } else {

        warn("cannotUpdateWidget", {path})
        return null
      }
    }
  )
}

/**
 * Using the path to a widget instance file, find the metadata.
 * @param path
 */
function getWidgetAndWidgetInstanceMetadata(path) {

  // Load the metadata for the base widget.
  return readMetadata(path, constants.widgetMetadataJson).then(
    (widgetMetadata) => {

      if (widgetMetadata) {
        return getWidgetInstanceMetadata(path, widgetMetadata)
      } else {
        warn("cannotUpdateWidget", {path})
        return null
      }
    }
  )
}

/**
 * Create a widget instance of the same name as that given in the path.
 * @param widgetMetadata
 * @param path
 */
function createMatchingWidgetInstance(widgetMetadata, path) {

  // Get the metadata for the local instance.
  const localWidgetInstanceMetadata = readMetadataFromDisk(path, constants.widgetInstanceMetadataJson)

  // Set up the JSON for the clone.
  const payload = {
    widgetDescriptorId : widgetMetadata.widgetType,
    displayName : localWidgetInstanceMetadata.displayName
  }

  // Firstly, clone an instance of the same name.
  return endPointTransceiver.createWidgetInstance([], request().withBody(payload))
  // Update the cache so it now contains info on the new widget.
    .then(() => cacheWidgetInstances())
}

exports.putWebContentWidgetInstanceTemplate = putWebContentWidgetInstanceTemplate
exports.putWidgetInstanceLess = putWidgetInstanceLess
exports.putWidgetInstanceSnippets = putWidgetInstanceSnippets
exports.putWidgetInstanceTemplate = putWidgetInstanceTemplate
exports.putWidgetJavaScript = putWidgetJavaScript
