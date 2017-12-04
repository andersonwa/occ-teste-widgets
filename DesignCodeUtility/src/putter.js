const dirname = require('path').dirname
const Promise = require("bluebird")
const upath = require("upath")
const walk = require('walk')

const classify = require("./classifier").classify
const constants = require("./constants").constants
const endPointTransceiver = require("./endPointTransceiver")
const error = require("./logger").error
const exists = require("./utils").exists
const info = require("./logger").info
const initializeMetadata = require("./metadata").initializeMetadata
const inTransferMode = require("./metadata").inTransferMode
const normalize = require("./utils").normalize
const putGlobalSnippets = require("./textSnippetPutter").putGlobalSnippets
const readMetadata = require("./metadata").readMetadata
const putApplicationJavaScript = require("./applicationJavaScriptPutter").putApplicationJavaScript
const putElementJavaScript = require("./elementPutter").putElementJavaScript
const putElementTemplate = require("./elementPutter").putElementTemplate
const putGlobalElementJavaScript = require("./elementPutter").putGlobalElementJavaScript
const putGlobalElementTemplate = require("./elementPutter").putGlobalElementTemplate
const putStackInstanceLess = require("./stackPutter").putStackInstanceLess
const putStackInstanceLessVariables = require("./stackPutter").putStackInstanceLessVariables
const putStackInstanceTemplate = require("./stackPutter").putStackInstanceTemplate
const putTheme = require("./themePutter").putTheme
const putThemeAdditionalStyles = require("./themePutter").putThemeAdditionalStyles
const putThemeStyles = require("./themePutter").putThemeStyles
const putThemeVariables = require("./themePutter").putThemeVariables
const putWebContentWidgetInstanceTemplate = require("./widgetPutter").putWebContentWidgetInstanceTemplate
const putWidgetInstanceLess = require("./widgetPutter").putWidgetInstanceLess
const putWidgetInstanceSnippets = require("./widgetPutter").putWidgetInstanceSnippets
const putWidgetInstanceTemplate = require("./widgetPutter").putWidgetInstanceTemplate
const putWidgetJavaScript = require("./widgetPutter").putWidgetJavaScript
const PuttingFileType = require("./classifier").PuttingFileType
const resolvePath = require("./utils").resolvePath

// Mapping between file type and putter method.
const putterMap = new Map([
  [PuttingFileType.APPLICATION_LEVEL_JAVASCRIPT, putApplicationJavaScript],
  [PuttingFileType.WIDGET_INSTANCE_TEMPLATE, putWidgetInstanceTemplate],
  [PuttingFileType.WEB_CONTENT_TEMPLATE, putWebContentWidgetInstanceTemplate],
  [PuttingFileType.WIDGET_INSTANCE_LESS, putWidgetInstanceLess],
  [PuttingFileType.WIDGET_INSTANCE_SNIPPETS, putWidgetInstanceSnippets],
  [PuttingFileType.WIDGET_JAVASCRIPT, putWidgetJavaScript],
  [PuttingFileType.ELEMENT_TEMPLATE, putElementTemplate],
  [PuttingFileType.ELEMENT_JAVASCRIPT, putElementJavaScript],
  [PuttingFileType.GLOBAL_ELEMENT_TEMPLATE, putGlobalElementTemplate],
  [PuttingFileType.GLOBAL_ELEMENT_JAVASCRIPT, putGlobalElementJavaScript],
  [PuttingFileType.THEME_STYLES, putThemeStyles],
  [PuttingFileType.THEME_ADDITIONAL_STYLES, putThemeAdditionalStyles],
  [PuttingFileType.THEME_VARIABLES, putThemeVariables],
  [PuttingFileType.GLOBAL_SNIPPETS, putGlobalSnippets],
  [PuttingFileType.STACK_INSTANCE_LESS, putStackInstanceLess],
  [PuttingFileType.STACK_INSTANCE_VARIABLES_LESS, putStackInstanceLessVariables],
  [PuttingFileType.STACK_INSTANCE_TEMPLATE, putStackInstanceTemplate],
  [PuttingFileType.THEME, putTheme]
])

/**
 * Entry point. Send the contents of all the files found beneath the given directory
 * to the appropriate place on the server.
 * @param path
 * @param node
 */
exports.putAll = function (path, node) {

  // Make sure directory actually exists.
  if (!exists(path)) {
    error("pathDoesNotExist", {path})
    return
  }

  // Normalize the path in case its in windows format, taking into account the base directory.
  const directory = resolvePath(path)

  // Walk through the supplied directory, looking for files.
  const walker = walk.walk(directory, {followLinks : false})

  // Keep a track of all the generated file names.
  const paths = []

  walker.on("file",
    (root, fileStat, next) => {

      // Build the full file name and keep a note of it - as long as its not under the tracking directory.
      const fullPath = upath.resolve(root, fileStat.name)
      if (!fullPath.includes(`/${constants.trackingDir}/`)) {

        // Treat Themes as a unit - put their *directory* in the list and make sure we just do it once.
        if (fullPath.includes(`/theme/`)) {
          (paths.indexOf(dirname(fullPath)) == -1) && paths.push(dirname(fullPath))
        } else {
          paths.push(fullPath)
        }
      }

      next()
    }).on('end',
    () => {

      // Wait for each promise in turn.
      return Promise.each(paths,
        (path) => {
          return exports.put(path, node)
        })
    })
}

/**
 * Entry point. Send the contents of the file given by path to the appropriate
 * place on the server.
 * @param rawPath
 * @param node
 */
exports.put = function (rawPath, node) {

  // Normalize the path in case its in windows format.
  const path = normalize(rawPath)

  // Make sure file actually exists.
  if (!exists(path)) {
    error("pathDoesNotExist", {path})
    return
  }

  // Initialize the metadata first.
  return initializeMetadata().then(
    () => {
      return readMetadata(path, constants.configMetadataJson).then(
        (configMetadata) => {

          // Check config.json and make sure we are putting to the same system we grabbed from.
          if (configMetadata.node !== node && !inTransferMode()) {
            error("cannotSendToDifferentNode", {
              path,
              node,
              configMetadataNode : configMetadata.node
            }, "Invalid Operation")
            return
          }

          // We are transferring between diferent servers. Need to do a few extra checks.
          if (inTransferMode()) {

            // Servers must be at the same version.
            if (configMetadata.commerceCloudVersion !== endPointTransceiver.commerceCloudVersion) {
              error("cannotSendToDifferentVersion", {
                path,
                node,
                configMetadataNode : configMetadata.node,
                configMetadataVersion : configMetadata.commerceCloudVersion,
                targetVersion : endPointTransceiver.commerceCloudVersion
              })

              return
            }

            // Servers must be different.
            if (configMetadata.node == node) {

              error("cannotSendToSameNode", {path, node})
              return
            }
          }

          info("sendingPath", {path, node})

          return putterMap.get(classify(path))(path)
        }
      )
    })
}
