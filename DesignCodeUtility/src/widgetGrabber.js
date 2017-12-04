"use strict"

const Promise = require("bluebird")

const constants = require("./constants").constants
const copyFieldContentsToFile = require("./grabberUtils").copyFieldContentsToFile
const dumpEtag = require("./etags").dumpEtag
const endPointTransceiver = require("./endPointTransceiver")
const exists = require("./utils").exists
const info = require("./logger").info
const makeTrackedDirectory = require("./utils").makeTrackedDirectory
const makeTrackedTree = require("./utils").makeTrackedTree
const readMetadataFromDisk = require("./metadata").readMetadataFromDisk
const request = require("./requestBuilder").request
const sanitizeName = require("./utils").sanitizeName
const writeEtag = require("./etags").writeEtag
const writeFile = require("./utils").writeFile
const writeFileAndETag = require("./grabberUtils").writeFileAndETag
const writeMetadata = require("./metadata").writeMetadata

// Set up a map to enable us to find the directory that corresponds to a widget type.
const widgetTypeToDirectoryMap = new Map()

/**
 * Pull down all the widgets from the server.
 */
exports.grabAllWidgets = function () {

  // Create widget top level dir first if it does not already exist.
  makeTrackedDirectory(constants.widgetsDir)

  // Look for Oracle supplied widgets. In parallel, grab any user created widgets. These will be grouped by type and be the latest version.
  // After we get the current versions, look about for any old ones.
  return Promise.all([
    endPointTransceiver.getAllWidgetInstances("?source=100").then(grabWidgets),
    endPointTransceiver.getAllWidgetInstances("?source=101").then(grabWidgets)])
    .then(grabWidgetInstances)
}

/**
 * Get the directory for the supplied widget type and version.
 * @param widgetType
 * @param version
 * @param isLatestVersion
 * @returns a string containing the relative path to the widget directory.
 */
exports.getDirectoryForWidget = function (widgetType, version, isLatestVersion) {

  // Elements belonging to the latest version will go in the top level directory.
  if (isLatestVersion) {

    return widgetTypeToDirectoryMap.get(widgetType)
  } else {
    // Not the latest version - stick them in a directory of the form widget/<widget name>/version/<version number>/element.
    const versionDir = `${widgetTypeToDirectoryMap.get(widgetType)}/${constants.versionDir}`
    const versionNumberDir = `${versionDir}/${version}`

    makeTrackedDirectory(versionDir)
    makeTrackedDirectory(versionNumberDir)

    return versionNumberDir
  }
}

/**
 * Walk through the array contained in results creating files on disk.
 * @param results
 */
function grabWidgets(results) {

  return Promise.each(results.data.items, widget => {

      // No point in grabbing widgets you can't edit.
      if (widget.editableWidget) {
        return grabWidget(widget)
      }
    })
}

/**
 * Given the ID of widget, grab the associated JavaScript and write it to the supplied directory.
 * @param id
 * @param widgetDir
 */
function grabAllJavaScript(id, widgetDir) {

  // Create the js dir under the widget if it does not exist already.
  const widgetJsDir = `${widgetDir}/js`
  makeTrackedDirectory(widgetJsDir)

  // Keep track of all the promises, returning them as a single promise at the end.
  const promises = []

  // Get the javascript - if any.
  endPointTransceiver.getWidgetDescriptorJavascriptInfoById([id]).then(results => {
      results.data.jsFiles && results.data.jsFiles.forEach(jsFile => {
          promises.push(endPointTransceiver.get(jsFile.url).tap(results => {
            writeFileAndETag(`${widgetJsDir}/${jsFile.name}`, results.data, results.response.headers.etag)
          }))
        }
      )
    }
  )

  return Promise.all(promises)
}

/**
 * Holds the boilerplate for writing widget metadata.
 * @param repositoryId
 * @param widgetType
 * @param version
 * @param displayName
 * @param widgetDir
 */
function writeWidgetMetadata(repositoryId, widgetType, version, displayName, widgetDir) {
  writeMetadata(`${widgetDir}/${constants.widgetMetadataJson}`, {repositoryId, widgetType, version, displayName})
}

/**
 * Create the top level and widget directory and do the house-keeping associated with it.
 * @param widget
 * @returns {string}
 */
function createWidgetDirectory(widget) {

  // Create the top level dirs for the widget first.
  const widgetDir = `${constants.widgetsDir}/${sanitizeName(widget.displayName)}`
  makeTrackedDirectory(widgetDir)

  // Record the directory for later use by things like element grabbing.
  widgetTypeToDirectoryMap.set(widget.widgetType, widgetDir)
  return widgetDir
}

/**
 * Using the supplied widget information, pull all available files from the server
 * and write them to disk.
 * @param widget
 */
function grabWidget(widget) {

  // Let the user know something is happening...
  info("grabbingWidget", {name : widget.displayName})

  // Create the top level directory.
  const widgetDir = createWidgetDirectory(widget)

  // Need to store the widget ID and type in the tracking dir for later.
  writeWidgetMetadata(widget.repositoryId, widget.widgetType, widget.version, widget.displayName, widgetDir)

  // Keep track of all the promises, returning them as a single promise at the end.
  const promises = []

  // Only try to pull the JS if we are allowed to.
  if (widget.jsEditable) {
    promises.push(grabAllJavaScript(widget.id, widgetDir))
  }

  // Make an instances directory for future use.
  const instancesDir = `${widgetDir}/instances`
  makeTrackedDirectory(instancesDir)

  return Promise.all(promises)
}

/**
 * Grab all the widget instances on the system, assuming we have already got the base widgets.
 */
function grabWidgetInstances() {

  return endPointTransceiver.listWidgets().then(results => {

    // Now look at each instance in turn.
    return Promise.each(results.data.items, (widgetInstance) => grabWidgetInstance(widgetInstance))
  })
}

/**
 * Get the CSS for the supplied instance.
 * @param widgetInstance
 * @param widgetInstanceDir
 * @returns A BlueBird promise
 */
function getInstanceCss(widgetInstance, widgetInstanceDir) {

  // Match value will be a combination of widget ID and widget instance ID. We want to replace this with something
  // neutral that we can transform again when put the code back up.
  return copyFieldContentsToFile("getWidgetLess", widgetInstance.id, "source",
    `${widgetInstanceDir}/${constants.widgetLess}`, constants.lessFileSubstitutionReqExp, constants.widgetInstanceSubstitutionValue)
}

/**
 * Process the supplied widget instance.
 * @param widgetInstance
 */
function grabWidgetInstance(widgetInstance) {

  // Let the user know something is happening.
  info("grabbingWidgetInstance", {name : widgetInstance.displayName})

  // See if we can find a widget dir.
  const widgetDir = widgetTypeToDirectoryMap.get(widgetInstance.descriptor.widgetType)

  // If there's no widget dir, it implies the widget is not editable and can be ignored.
  if (widgetDir) {

    // Create directory for each widget instance.
    const widgetInstanceDir = `${widgetDir}/instances/${sanitizeName(widgetInstance.displayName)}`

    // See if we already have grabbed a version of the instance.
    if (exists(widgetInstanceDir)) {

      // Get the version from the instance we currently have on disk.
      const versionOnDisk = readMetadataFromDisk(widgetInstanceDir, constants.widgetInstanceMetadataJson).version

      // If the one on disk is more up to date, don't go any further.
      if (versionOnDisk > widgetInstance.descriptor.version) {
        return null
      }
    }

    // Safe to go ahead and start building.
    makeTrackedTree(widgetInstanceDir)

    // Save off the metadata for the instance.
    const widgetInstanceJson = {}
    widgetInstanceJson.repositoryId = widgetInstance.repositoryId
    widgetInstanceJson.descriptorRepositoryId = widgetInstance.descriptor.repositoryId
    widgetInstanceJson.version = widgetInstance.descriptor.version
    widgetInstanceJson.displayName = widgetInstance.displayName
    writeMetadata(`${widgetInstanceDir}/${constants.widgetInstanceMetadataJson}`, widgetInstanceJson)

    // Get the template first.
    return getInstanceTemplate(widgetInstance.descriptor.widgetType, widgetInstance.id, widgetInstanceDir).then(
      // Then, grab the style sheet.
      () => getInstanceCss(widgetInstance, widgetInstanceDir)).then(
      () => {
        // Make the locales directories first.
        makeTrackedDirectory(`${widgetInstanceDir}/locales`)

        // Then do the locales request one by one to stop us running out of connections.
        return Promise.each(endPointTransceiver.locales, locale => getWidgetSnippets(widgetInstance, widgetInstanceDir, locale))
      }
    )
  }
}

/**
 * Get the template for the instance.
 * @param widgetType
 * @param widgetInstanceId
 * @param widgetInstanceDir
 * @returns A Bluebird promise.
 */
function getInstanceTemplate(widgetType, widgetInstanceId, widgetInstanceDir) {

  const promises = []

  // Grab the base template.
  promises.push(copyFieldContentsToFile("getWidgetSourceCode", widgetInstanceId, "source", `${widgetInstanceDir}/${constants.widgetTemplate}`))

  // Web Content widgets are special in that the template with the actual content is on a different endpoint. Pull it down as well in a different file.
  if (widgetType === "webContent") {
    promises.push(copyFieldContentsToFile("getWidgetWebContent", widgetInstanceId, "content", `${widgetInstanceDir}/${constants.webContentTemplate}`))
  }

  return Promise.all(promises)
}

/**
 * Get all the snippets associated with a specific locale and widget instance.
 * @param widgetInstance
 * @param widgetInstanceDir
 * @param locale
 * @returns a Bluebird promise.
 */
function getWidgetSnippets(widgetInstance, widgetInstanceDir, locale) {

  // Get the text snippets for the "current" locale.
  return endPointTransceiver.getWidgetLocaleContent([widgetInstance.id], request().withLocale(locale.name)).tap(
    (results) => {

      // See if we got any locale data.
      if (results.data.localeData && Object.keys(results.data.localeData.resources).length) {

        // Create directory for the current locale.
        const widgetInstanceLocaleDir = `${widgetInstanceDir}/locales/${locale.name}`
        makeTrackedDirectory(widgetInstanceLocaleDir)

        // If there are custom field values, use these to override the base values.
        results.data.localeData.custom && Object.keys(results.data.localeData.resources).forEach((key) => {
          if (results.data.localeData.custom[key]) {
            results.data.localeData.resources[key] = results.data.localeData.custom[key]
          }
        })

        // Write out the text strings as a JSON file.
        const localeStringsFile = `${widgetInstanceLocaleDir}/ns.${widgetInstance.descriptor.widgetType.toLowerCase()}.json`
        writeFile(localeStringsFile, JSON.stringify(results.data.localeData.resources, null, 2))

        // Write out the etag.
        writeEtag(localeStringsFile, results.response.headers.etag)
      }
    }
  )
}
