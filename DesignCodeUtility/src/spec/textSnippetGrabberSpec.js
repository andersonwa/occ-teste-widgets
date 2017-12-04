const constants = require("../constants").constants
const mockery = require("./mockery")

describe("Text Snippet Grabber", () => {

  const self = this

  beforeEach(() => {

    mockery.use(jasmine.createSpy)

    self.endPointTransceiver = mockery.mockModule("../endPointTransceiver", "getResourceStrings")
    self.endPointTransceiver.locales = [{name : "en"}]

    mockery.mockModules(self, "../utils", "../grabberUtils", "../logger")

    self.textSnippetGrabber = mockery.require("../textSnippetGrabber")
  })

  afterEach(mockery.stopAll)

  it("should stop you if the server does not support the right endpoints", () => {

    self.endPointTransceiver.serverSupports.returnsFalse()

    self.textSnippetGrabber.grabCommonTextSnippets()

    expect(self.logger.warn).toHaveBeenCalledWith("textSnippetsCannotBeGrabbed")
  })

  it("should let you grab all Application JavaScript", (done) => {

    self.endPointTransceiver.serverSupports.returnsTrue()

    self.endPointTransceiver.getResourceStrings.returnsResponse(
      {
        resources : {
          "shippingItemRelationshipStates" : {
            "PENDING_SUBITEM_DELIVERY_SG" : "The item is wait for dependent sub-items from inventory",
            "WILL_BE_OVERRIDDEN" : "You should NOT see this value"
          }
        },
        custom : {
          "WILL_BE_OVERRIDDEN" : "You SHOULD see this value"
        }
      }, "resource string etag")

    self.textSnippetGrabber.grabCommonTextSnippets().then(
      () => {

        expect(self.endPointTransceiver.getResourceStrings.calls.mostRecent().args[0]).toEqual(["ns.common"])
        expect(self.endPointTransceiver.getResourceStrings.calls.mostRecent().args[1].locale).toEqual("en")

        expect(self.utils.makeTrackedDirectory).toHaveBeenCalledWith(constants.textSnippetsDir)
        expect(self.utils.makeTrackedDirectory).toHaveBeenCalledWith(`${constants.textSnippetsDir}/en`)
        expect(self.logger.info).toHaveBeenCalledWith('grabbingTextSnippets', {name : 'en'})
        expect(self.grabberUtils.writeFileAndETag).toHaveBeenCalledWith(
          "snippets/en/snippets.json",
          JSON.stringify({
            "shippingItemRelationshipStates": {
              "PENDING_SUBITEM_DELIVERY_SG": "The item is wait for dependent sub-items from inventory",
              "WILL_BE_OVERRIDDEN": "You SHOULD see this value"
            }
          }, null, 2),
          "resource string etag")
        done()
      }
    )
  })
})
