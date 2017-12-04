"use strict"

const Promise = require("bluebird")

const constants = require('../constants').constants
const mockery = require('./mockery')

describe("Widget Putter", () => {

  const self = this

  const widgetInstanceTemplatePath = "widget/Gift Card/instances/Gift Card Widget/display.template"
  const webContentTemplatePath = "widget/Web Content/instances/About Us Web Content Widget/content.template"
  const widgetJsPath = "widget/VCS QUOTE widget with - dashes test/js/quote-tester.js"
  const widgetLessPath = "widget/Cart Summary/instances/Cart Summary Widget/widget.less"
  const widgetSnippetsPath = "widget/Cart Shipping/instances/Cart Shipping/locales/de/ns.cartshippingdetails.json"

  const putResults = {}

  beforeEach(() => {

    mockery.use(jasmine.createSpy)

    self.endPointTransceiver = mockery.mockModule('../endPointTransceiver',
      "getWidget", "updateWidgetWebContent", "updateWidgetDescriptorJavascript",
      "updateWidgetCustomTranslations", "updateWidgetSourceCode", "updateWidgetLess",
      "createWidgetInstance")

    mockery.mockModules(self, '../utils', '../putterUtils', '../metadata', '../logger', "../etags")

    // Force a reload of request builder as it can be left with old spies as we do not normally mock it.
    mockery.require('../requestBuilder')

    // Need to call this before we mock out Bluebird.
    self.metadata.readMetadata.and.callFake(Promise.method(function (path, type) {

      if (type == constants.widgetMetadataJson) {

        return {
          repositoryId : "rep1234",
          etag : "etag value"
        }
      } else {

        return {
          repositoryId : "rep5678",
          descriptorRepositoryId : "rep1234",
          etag : "etag value"
        }
      }
    }))

    self.utils.readFile.returns("#WIDGET_ID-WIDGET_INSTANCE_ID {}")

    self.widgetPutter = mockery.require("../widgetPutter")

    self.endPointTransceiver.updateWidgetSourceCode.returnsPromise(putResults)
    self.endPointTransceiver.getWidget.returnsResponse({
      name : "a name",
      notes : "some notes"
    })
    self.endPointTransceiver.updateWidgetWebContent.returnsPromise(putResults)
    self.endPointTransceiver.updateWidgetDescriptorJavascript.returnsPromise(putResults)
    self.endPointTransceiver.updateWidgetLess.returnsPromise(putResults)
    self.endPointTransceiver.updateWidgetCustomTranslations.returnsPromise(putResults)
  })

  afterEach(mockery.stopAll)

  it("should let you put widget templates on the server", (done) => {

    self.widgetPutter.putWidgetInstanceTemplate(widgetInstanceTemplatePath).then(
      () => {

        expect(self.endPointTransceiver.updateWidgetSourceCode.calls.mostRecent().args[0]).toEqual(["rep5678"])
        const requestBuilder = self.endPointTransceiver.updateWidgetSourceCode.calls.mostRecent().args[1]
        expect(requestBuilder.path).toEqual(widgetInstanceTemplatePath)
        expect(requestBuilder.field).toEqual("source")
        expect(requestBuilder.etag).toEqual("etag value")

        expect(self.putterUtils.processPutResultAndEtag).toHaveBeenCalledWith(widgetInstanceTemplatePath, putResults)
        done()
      }
    )
  })

  it("should let you put web content widget templates on the server", (done) => {

    self.utils.readFile.returns("some web content markup")

    self.widgetPutter.putWebContentWidgetInstanceTemplate(webContentTemplatePath).then(
      () => {

        expect(self.endPointTransceiver.updateWidgetWebContent.calls.mostRecent().args[0]).toEqual(["rep5678"])

        const requestBuilder = self.endPointTransceiver.updateWidgetWebContent.calls.mostRecent().args[1]
        expect(requestBuilder.body.widgetConfig.name).toEqual("a name")
        expect(requestBuilder.body.widgetConfig.notes).toEqual("some notes")
        expect(requestBuilder.body.content).toEqual("some web content markup")
        expect(requestBuilder.etag).toEqual("etag value")

        expect(self.putterUtils.processPutResultAndEtag).toHaveBeenCalledWith(webContentTemplatePath, putResults)
        done()
      }
    )
  })

  it("should let you put widget JavaScript on the server", (done) => {

    self.widgetPutter.putWidgetJavaScript(widgetJsPath).then(
      () => {

        expect(self.endPointTransceiver.updateWidgetDescriptorJavascript.calls.mostRecent().args[0]).toEqual(["rep1234", "quote-tester.js"])
        const requestBuilder = self.endPointTransceiver.updateWidgetDescriptorJavascript.calls.mostRecent().args[1]
        expect(requestBuilder.path).toEqual(widgetJsPath)
        expect(requestBuilder.field).toEqual("source")
        expect(requestBuilder.etag).toEqual("etag value")

        expect(self.putterUtils.processPutResultAndEtag).toHaveBeenCalledWith(widgetJsPath, putResults)
        done()
      }
    )
  })

  it("should process widget less files correctly", (done) => {

    self.widgetPutter.putWidgetInstanceLess(widgetLessPath, true).then(
      () => {

        expect(self.endPointTransceiver.updateWidgetLess.calls.mostRecent().args[0]).toEqual(["rep5678"])
        const requestBuilder = self.endPointTransceiver.updateWidgetLess.calls.mostRecent().args[1]
        expect(requestBuilder.path).toEqual(widgetLessPath)
        expect(requestBuilder.field).toEqual("source")
        expect(requestBuilder.etag).toEqual("etag value")
        expect(requestBuilder.build().data.source).toEqual("#rep1234-rep5678 {}")

        expect(self.putterUtils.processPutResultAndEtag).toHaveBeenCalledWith(widgetLessPath, putResults)
        done()
      }
    )
  })

  it("should process locale files correctly", (done) => {

    self.widgetPutter.putWidgetInstanceSnippets(widgetSnippetsPath, true).then(
      () => {

        expect(self.endPointTransceiver.updateWidgetCustomTranslations.calls.mostRecent().args[0]).toEqual(["rep5678"])
        const requestBuilder = self.endPointTransceiver.updateWidgetCustomTranslations.calls.mostRecent().args[1]
        expect(requestBuilder.path).toEqual(widgetSnippetsPath)
        expect(requestBuilder.field).toEqual("custom")
        expect(requestBuilder.locale).toEqual("de")

        expect(self.putterUtils.processPutResultAndEtag).toHaveBeenCalledWith(widgetSnippetsPath, putResults)
        done()
      }
    )
  })

  it("should create a widget instance where one does not exist in transfer mode", (done) => {

    self.metadata.inTransferMode.returnsTrue()

    let instanceCreated = false

    self.metadata.readMetadata.and.callFake(Promise.method(function (path, type) {

      if (type == constants.widgetMetadataJson) {
        return {
          repositoryId : "rep1234",
          widgetType : "cuteWidgetType",
          etag : "etag value"
        }
      } else {
        // Only return metadata for widget instances after the instance has been "created".
        return instanceCreated ? {repositoryId : "rep9012"} : null
      }
    }))
    self.metadata.readMetadataFromDisk.returns({displayName : "Instance To Create"})
    self.endPointTransceiver.createWidgetInstance.and.callFake(Promise.method(function (path, type) {

      // Create has been called. Set a flag so readMetadata() can now return something.
      instanceCreated = true
      return {}
    }))

    self.widgetPutter.putWidgetInstanceSnippets(widgetSnippetsPath, true).then(
      () => {

        expect(self.endPointTransceiver.createWidgetInstance.calls.mostRecent().args[0]).toEqual([])
        const createWidgetInstanceRequestBuilder = self.endPointTransceiver.createWidgetInstance.calls.mostRecent().args[1]
        expect(createWidgetInstanceRequestBuilder.body.widgetDescriptorId).toEqual("cuteWidgetType")
        expect(createWidgetInstanceRequestBuilder.body.displayName).toEqual("Instance To Create")

        expect(self.endPointTransceiver.updateWidgetCustomTranslations.calls.mostRecent().args[0]).toEqual(["rep9012"])
        const updateWidgetCustomTranslationsRequestBuilder = self.endPointTransceiver.updateWidgetCustomTranslations.calls.mostRecent().args[1]
        expect(updateWidgetCustomTranslationsRequestBuilder.path).toEqual(widgetSnippetsPath)
        expect(updateWidgetCustomTranslationsRequestBuilder.field).toEqual("custom")

        expect(self.logger.warn).toHaveBeenCalledWith('creatingWidgetInstance', {path : widgetSnippetsPath})

        expect(self.putterUtils.processPutResultAndEtag).toHaveBeenCalledWith(widgetSnippetsPath, putResults)
        done()
      }
    )
  })

  it("should handle not being able to find widget metadata", (done) => {

    self.metadata.readMetadata.returnsPromise(null)

    self.widgetPutter.putWidgetJavaScript(widgetJsPath).then(
      () => {

        expect(self.endPointTransceiver.updateWidgetDescriptorJavascript).not.toHaveBeenCalled()
        done()
      }
    )
  })

  it("should handle not being able to find widget metadata when trying to update an instance and not in transfer mode", (done) => {

    self.metadata.readMetadata.returnsPromise(null)

    self.widgetPutter.putWidgetInstanceSnippets(widgetSnippetsPath, true).then(
      () => {

        expect(self.endPointTransceiver.updateWidgetCustomTranslations).not.toHaveBeenCalled()
        expect(self.logger.warn).toHaveBeenCalledWith('cannotUpdateWidget', {path : widgetSnippetsPath})
        done()
      }
    )
  })

  it("should not create a widget instance where one does not exist outside of transfer mode", (done) => {

    self.metadata.readMetadata.and.callFake(Promise.method((path, type) => type == constants.widgetMetadataJson ? {} : null))
    self.metadata.readMetadataFromDisk.returns({displayName : "Instance To Create"})

    self.widgetPutter.putWidgetInstanceSnippets(widgetSnippetsPath, true).then(
      () => {

        expect(self.endPointTransceiver.createWidgetInstance).not.toHaveBeenCalled()
        expect(self.endPointTransceiver.updateWidgetCustomTranslations).not.toHaveBeenCalled()
        expect(self.putterUtils.processPutResultAndEtag).not.toHaveBeenCalled()
        expect(self.logger.warn).toHaveBeenCalledWith('cannotUpdateWidget', {path : "widget/Cart Shipping/instances/Cart Shipping/locales/de/ns.cartshippingdetails.json"})
        done()
      }
    )
  })
})
