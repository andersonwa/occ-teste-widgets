"use strict"

const Enum = require('enumify').Enum

const constants = require("./constants").constants
const splitFromBaseDir = require("./utils").splitFromBaseDir
const warn = require("./logger").warn

class PuttingFileType extends Enum {
}
PuttingFileType.initEnum([
  'APPLICATION_LEVEL_JAVASCRIPT',
  'WIDGET_INSTANCE_TEMPLATE',
  'WEB_CONTENT_TEMPLATE',
  'WIDGET_INSTANCE_LESS',
  'WIDGET_INSTANCE_SNIPPETS',
  'WIDGET_JAVASCRIPT',
  'ELEMENT_TEMPLATE',
  'ELEMENT_JAVASCRIPT',
  'GLOBAL_ELEMENT_TEMPLATE',
  'GLOBAL_ELEMENT_JAVASCRIPT',
  'THEME_STYLES',
  'THEME',
  'THEME_ADDITIONAL_STYLES',
  'THEME_VARIABLES',
  'GLOBAL_SNIPPETS',
  'STACK_INSTANCE_LESS',
  'STACK_INSTANCE_VARIABLES_LESS',
  'STACK_INSTANCE_TEMPLATE'
])

exports.PuttingFileType = PuttingFileType

/**
 * Figure out what kind of file we have so we know what endpoint to call.
 * @param path
 */
exports.classify = function (path) {

  // Split the path up to help with analysis.
  const splitDirs = splitFromBaseDir(path)
  const baseDir = splitDirs[0], subDir = splitDirs[1]

  switch (true) {
    case subDir.startsWith(constants.globalDir):
      return PuttingFileType.APPLICATION_LEVEL_JAVASCRIPT
    case path.endsWith(constants.widgetTemplate):
      return PuttingFileType.WIDGET_INSTANCE_TEMPLATE
    case path.endsWith(constants.webContentTemplate):
      return PuttingFileType.WEB_CONTENT_TEMPLATE
    case path.endsWith(constants.widgetLess):
      return PuttingFileType.WIDGET_INSTANCE_LESS
    case /.*\/ns\.\w*\.json/.test(path):
      return PuttingFileType.WIDGET_INSTANCE_SNIPPETS
    case /.*widget\/[^/]*\/js\/[^/]*.js/.test(path):
      return PuttingFileType.WIDGET_JAVASCRIPT
    case subDir.startsWith(`${constants.elementsDir}/`) && path.endsWith(constants.elementTemplate):
      return PuttingFileType.GLOBAL_ELEMENT_TEMPLATE
    case subDir.startsWith(`${constants.elementsDir}/`) && path.endsWith(constants.elementJavaScript):
      return PuttingFileType.GLOBAL_ELEMENT_JAVASCRIPT
    case path.endsWith(constants.elementTemplate):
      return PuttingFileType.ELEMENT_TEMPLATE
    case path.endsWith(constants.elementJavaScript):
      return PuttingFileType.ELEMENT_JAVASCRIPT
    case path.endsWith(constants.themeStyles):
      return PuttingFileType.THEME_STYLES
    case path.endsWith(constants.themeAdditionalStyles):
      return PuttingFileType.THEME_ADDITIONAL_STYLES
    case path.endsWith(constants.stackVariablesLess):
      return PuttingFileType.STACK_INSTANCE_VARIABLES_LESS
    case path.endsWith(constants.stackTemplate):
      return PuttingFileType.STACK_INSTANCE_TEMPLATE
    case path.endsWith(constants.themeVariables):
      return PuttingFileType.THEME_VARIABLES
    case path.endsWith(constants.snippetsJson):
      return PuttingFileType.GLOBAL_SNIPPETS
    case path.endsWith(constants.stackLess):
      return PuttingFileType.STACK_INSTANCE_LESS
    case /.*theme\/[^/]*/.test(path) || path.endsWith(constants.themesDir):
      return PuttingFileType.THEME
    default:
      warn("fileIsNotRecognized", {name : path})
  }
}
