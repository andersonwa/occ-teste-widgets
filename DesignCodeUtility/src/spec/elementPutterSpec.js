const constants = require('../constants').constants
const mockery = require('./mockery')

describe("Element Putter", () => {

  const self = this

  const elementJsPath = "element/Contact Login (for Managed Accounts)/element.js"
  const elementTemplatePath = "element/Contact Login (for Managed Accounts)/element.template"
  const widgetElementJsPath = "widget/Cart Shipping/element/Shipping Address/element.js"
  const widgetElementTemplatePath = "widget/Cart Shipping/element/Shipping Address/element.template"

  beforeEach(() => {

    mockery.use(jasmine.createSpy)

    self.endPointTransceiver = mockery.mockModule('../endPointTransceiver',
      "updateGlobalElementTemplate", "updateGlobalElementJavaScript",
      "updateFragmentTemplate", "updateFragmentJavaScript")

    mockery.mockModules(self, '../utils', '../metadata', '../putterUtils', '../logger')

    self.elementPutter = mockery.require("../elementPutter")
  })

  afterEach(mockery.stopAll)

  it("should stop you if the server does not support the right endpoints", () => {

    self.endPointTransceiver.serverSupports.returnsFalse()

    self.elementPutter.putGlobalElementJavaScript(elementJsPath)

    expect(self.logger.warn).toHaveBeenCalledWith('elementsCannotBeSent', {path : elementJsPath})
  })

  /**
   * Put the boilerplate in one place.
   */
  function fakeMetadataAndEndpointSupport() {

    self.endPointTransceiver.serverSupports.returnsTrue()

    self.metadata.readMetadata.returnsPromise(
      {
        tag : "my-element-tag",
        etag : "BIG_ELEMENT_ETAG"
      })
  }

  it("should let you put global element JavaScript on the server", (done) => {

    fakeMetadataAndEndpointSupport()
    self.utils.readFile.returns("some javascript")
    const response = self.endPointTransceiver.updateGlobalElementJavaScript.returnsPromise({})

    self.elementPutter.putGlobalElementJavaScript(elementJsPath).then(
      () => {

        expect(self.endPointTransceiver.updateGlobalElementJavaScript.calls.mostRecent().args[0]).toEqual(["my-element-tag"])
        const requestBuilder = self.endPointTransceiver.updateGlobalElementJavaScript.calls.mostRecent().args[1]
        expect(requestBuilder.etag).toEqual("BIG_ELEMENT_ETAG")
        expect(requestBuilder.body).toEqual({code : {javascript : 'some javascript'}})

        expect(self.putterUtils.processPutResultAndEtag).toHaveBeenCalledWith(elementJsPath, response)
        done()
      }
    )
  })

  it("should let you put global element templates on the server", (done) => {

    fakeMetadataAndEndpointSupport()
    self.utils.readFile.returns("some template")
    const response = self.endPointTransceiver.updateGlobalElementTemplate.returnsPromise({})

    self.elementPutter.putGlobalElementTemplate(elementTemplatePath).then(
      () => {

        expect(self.endPointTransceiver.updateGlobalElementTemplate.calls.mostRecent().args[0]).toEqual(["my-element-tag"])
        const requestBuilder = self.endPointTransceiver.updateGlobalElementTemplate.calls.mostRecent().args[1]
        expect(requestBuilder.etag).toEqual("BIG_ELEMENT_ETAG")
        expect(requestBuilder.body).toEqual({code : {template : 'some template'}})

        expect(self.putterUtils.processPutResultAndEtag).toHaveBeenCalledWith(elementTemplatePath, response)
        done()
      }
    )
  })

  it("should tell you when it cant put global element templates on the server as there is no metadata", (done) => {

    self.endPointTransceiver.serverSupports.returnsTrue()
    self.metadata.readMetadata.returnsPromise(null)

    self.elementPutter.putGlobalElementTemplate(elementTemplatePath).then(
      () => {

        expect(self.logger.warn).toHaveBeenCalledWith('cannotUpdateElement', {path : elementTemplatePath})
        done()
      }
    )
  })

  it("should let you put widget element templates on the server", (done) => {

    self.endPointTransceiver.serverSupports.returnsTrue()

    self.metadata.readMetadata.returnsPromise(
      {
        tag : "my-element-tag",
        etag : "BIG_ELEMENT_ETAG",
        widgetId : "my-widget-id"
      })

    self.utils.readFile.returns("some javascript")

    const response = self.endPointTransceiver.updateFragmentJavaScript.returnsPromise({})

    self.elementPutter.putElementJavaScript(widgetElementJsPath).then(
      () => {

        expect(self.endPointTransceiver.updateFragmentJavaScript.calls.mostRecent().args[0]).toEqual(["my-widget-id", "my-element-tag"])
        const requestBuilder = self.endPointTransceiver.updateFragmentJavaScript.calls.mostRecent().args[1]
        expect(requestBuilder.etag).toEqual("BIG_ELEMENT_ETAG")
        expect(requestBuilder.body).toEqual({code : {javascript : 'some javascript'}})

        expect(self.putterUtils.processPutResultAndEtag).toHaveBeenCalledWith(widgetElementJsPath, response)
        done()
      }
    )
  })

  it("should let you put widget element javascript on the server", (done) => {

    self.endPointTransceiver.serverSupports.returnsTrue()

    self.metadata.readMetadata.returnsPromise(
      {
        tag : "my-element-tag",
        etag : "BIG_ELEMENT_ETAG",
        widgetId : "my-widget-id"
      })

    self.utils.readFile.returns("some template")

    const response = self.endPointTransceiver.updateFragmentTemplate.returnsPromise({})

    self.elementPutter.putElementTemplate(widgetElementTemplatePath).then(
      () => {

        expect(self.endPointTransceiver.updateFragmentTemplate.calls.mostRecent().args[0]).toEqual(["my-widget-id", "my-element-tag"])
        const requestBuilder = self.endPointTransceiver.updateFragmentTemplate.calls.mostRecent().args[1]
        expect(requestBuilder.etag).toEqual("BIG_ELEMENT_ETAG")
        expect(requestBuilder.body).toEqual({code : {template : 'some template'}})

        expect(self.putterUtils.processPutResultAndEtag).toHaveBeenCalledWith(widgetElementTemplatePath, response)
        done()
      }
    )
  })
})
