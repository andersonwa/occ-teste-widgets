const constants = require("../constants").constants
const mockery = require("./mockery")

describe("Text Snippet Putter", () => {

  const self = this

  const snippetsPath = "snippets/en/snippets.json"

  beforeEach(() => {

    mockery.use(jasmine.createSpy)

    self.endPointTransceiver = mockery.mockModule("../endPointTransceiver", "updateCustomTranslations")

    mockery.mockModules(self, "../putterUtils", "../utils", "../logger", "../etags")

    self.textSnippetPutter = mockery.require("../textSnippetPutter")
  })

  afterEach(mockery.stopAll)

  it("should stop you if the server does not support the right endpoints", () => {

    self.endPointTransceiver.serverSupports.returnsFalse()

    self.textSnippetPutter.putGlobalSnippets(snippetsPath)

    expect(self.logger.warn).toHaveBeenCalledWith("textSnippetsCannotBeSent", {path : snippetsPath})
  })

  it("should let you send snippets back", (done) => {

    self.endPointTransceiver.serverSupports.returnsTrue()
    const results = self.endPointTransceiver.updateCustomTranslations.returnsPromise({})
    self.etags.eTagFor.returns("etag value")
    self.utils.readJsonFile.returns(
      {
        "snippetTextGroup" : {
          "snippet_key" : "some snippet text"
        }
      })

    self.textSnippetPutter.putGlobalSnippets(snippetsPath).then(
      () => {

        expect(self.endPointTransceiver.updateCustomTranslations.calls.mostRecent().args[0]).toEqual(["ns.common"])
        const requestBuilder = self.endPointTransceiver.updateCustomTranslations.calls.mostRecent().args[1]
        expect(requestBuilder.locale).toEqual("en")
        expect(requestBuilder.etag).toEqual("etag value")
        expect(requestBuilder.body.custom.snippet_key).toEqual("some snippet text")
        expect(self.putterUtils.processPutResultAndEtag).toHaveBeenCalledWith(snippetsPath, results)
        done()
      }
    )
  })

})
