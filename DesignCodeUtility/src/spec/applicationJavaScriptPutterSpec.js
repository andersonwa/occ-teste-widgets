const constants = require('../constants').constants
const mockery = require('./mockery')

describe("Application JavaScript Putter", () => {

  const self = this

  const javaScriptPath = "global/myLittle.js"

  beforeEach(() => {

    mockery.use(jasmine.createSpy)

    self.endPointTransceiver = mockery.mockModule('../endPointTransceiver', "updateApplicationJavaScript")
    mockery.mockModules(self, '../putterUtils', '../utils', '../etags', '../logger')

    self.applicationJavaScriptPutter = mockery.require("../applicationJavaScriptPutter")
  })

  afterEach(mockery.stopAll)

  it("should stop you if the server does not support the right endpoints", () => {

    self.endPointTransceiver.serverSupports.returnsFalse()

    self.applicationJavaScriptPutter.putApplicationJavaScript(javaScriptPath)

    expect(self.logger.warn).toHaveBeenCalledWith("applicationJavaScriptCannotBeSent")
  })

  it("should let you update Application JavaScript", (done) => {

    self.endPointTransceiver.serverSupports.returnsTrue()
    self.etags.eTagFor.returns("etag value")
    const results = self.endPointTransceiver.updateApplicationJavaScript.returnsPromise({})

    self.applicationJavaScriptPutter.putApplicationJavaScript(javaScriptPath).then(
      () => {

        expect(self.endPointTransceiver.updateApplicationJavaScript.calls.mostRecent().args[0]).toEqual(["myLittle.js"])
        const requestBuilder = self.endPointTransceiver.updateApplicationJavaScript.calls.mostRecent().args[1]
        expect(requestBuilder.field).toEqual("source")
        expect(requestBuilder.path).toEqual(javaScriptPath)
        expect(requestBuilder.etag).toEqual("etag value")
        expect(self.etags.eTagFor).toHaveBeenCalledWith(javaScriptPath)
        expect(self.putterUtils.processPutResultAndEtag).toHaveBeenCalledWith(javaScriptPath, results)

        done()
      }
    )
  })
})
