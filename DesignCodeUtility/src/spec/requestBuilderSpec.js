"use strict"

const constants = require("../constants").constants
const mockery = require("./mockery")

describe("Request Builder", () => {

  const self = this

  beforeEach(() => {

    mockery.use(jasmine.createSpy)

    mockery.mockModules(self, "../utils", "../endPointTransceiver")

    self.utils.readFile.returns("file contents")

    self.requestBuilder = mockery.require("../requestBuilder").request()
  })

  afterEach(mockery.stopAll)

  it("should let build a request", () => {

    const request = self.requestBuilder
      .withHeader("someHeader", "some header value")
      .withLocale("en").withEtag("QUITE_SHORT_ETAG")
      .fromPathAs("some/path/to/source.js", "source")
      .withBody("small body").build("access token",
        {
          useOptimisticLock : true,
          localeHint : "assetLanguageRequired"
        })

    expect(request.headers.someHeader).toEqual("some header value")
    expect(request.headers.Accept).toEqual("application/json, text/javascript, */*; q=0.01")
    expect(request.headers["X-CCProfileType"]).toEqual("adminUI")
    expect(request.headers.Authorization).toEqual("Bearer access token")
    expect(request.headers["Content-Type"]).toEqual("application/json")
    expect(request.headers.ETag).toEqual("QUITE_SHORT_ETAG")
    expect(request.headers["If-Match"]).toEqual("QUITE_SHORT_ETAG")
    expect(request.headers["X-CCAsset-Language"]).toEqual("en")

    expect(request.data.source).toEqual("file contents")
  })
})
