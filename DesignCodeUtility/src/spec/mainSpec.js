const mockery = require('./mockery')

describe("main", () => {

  const self = this

  beforeEach(() => {

    mockery.use(jasmine.createSpy)

    self.commander = mockery.require('commander') // Need to force a reload each time or it will hold onto the previous data.
    self.commander.help = jasmine.createSpy("help") // Just do a partial mock on help method - leave the rest as is.

    mockery.mockModules(self, '../endPointTransceiver', '../metadata', '../grabber', '../putter', '../i18n', '../utils')

    self.endPointTransceiver.init.returnsPromise()

    self.mainModule = mockery.require("../main")
  })

  afterEach(
    () => {
      delete process.env.CC_ADMIN_PASSWORD // Need to make sure this is gone or subsequent tests will be affected.
      mockery.stopAll()
    }
  )

  it("should let you grab stuff", (done) => {

    self.mainModule.main(["unused", "unused", "--grab", "--clean", "--node", "http://somehost:8090"]).then(
      () => {

        expect(self.endPointTransceiver.init).toHaveBeenCalledWith("http://somehost:8090", "admin", "admin", undefined, undefined)
        expect(self.grabber.grab).toHaveBeenCalledWith("http://somehost:8090", true, true)
        done()
      }
    )
  })

  it("should let you put files back", (done) => {

    self.mainModule.main(["unused", "unused", "--put", "widget/Cart Shipping/instances/Cart Shipping/display.template", "--node", "http://somehost:8090"]).then(
      () => {

        expect(self.endPointTransceiver.init).toHaveBeenCalledWith("http://somehost:8090", "admin", "admin", undefined, undefined)
        expect(self.putter.put).toHaveBeenCalledWith("widget/Cart Shipping/instances/Cart Shipping/display.template", "http://somehost:8090", true)
        done()
      }
    )
  })

  it("should let you put multiple files back", (done) => {

    self.mainModule.main(["unused", "unused", "--putAll", "widget/Cart Shipping/instances", "--node", "http://somehost:8090"]).then(
      () => {

        expect(self.endPointTransceiver.init).toHaveBeenCalledWith("http://somehost:8090", "admin", "admin", undefined, undefined)
        expect(self.putter.putAll).toHaveBeenCalledWith("widget/Cart Shipping/instances", "http://somehost:8090")
        done()
      }
    )
  })

  it("should let you transfer files", (done) => {

    self.mainModule.main(["unused", "unused", "--transferAll", "widget/Cart Shipping/instances", "--node", "http://somehost:8090"]).then(
      () => {

        expect(self.metadata.inTransferMode).toHaveBeenCalledWith(true)
        expect(self.endPointTransceiver.init).toHaveBeenCalledWith("http://somehost:8090", "admin", "admin", undefined, undefined)
        expect(self.putter.putAll).toHaveBeenCalledWith("widget/Cart Shipping/instances", "http://somehost:8090")
        done()
      }
    )
  })

  it("should ensure you specify a node", () => {

    self.mainModule.main(["unused", "unused", "--transferAll", "widget/Cart Shipping/instances"])

    expect(self.commander.help).toHaveBeenCalled()
  })

  it("should ensure you specify sensible command line combinations", () => {

    self.mainModule.main(["unused", "unused", "--transferAll", "widget/Cart Shipping/instances", "--allLocales", "--node", "http://somehost:8090"])

    expect(self.commander.help).toHaveBeenCalled()
  })

  it("should ensure you do not specify multiple operations", () => {

    self.mainModule.main(["unused", "unused", "--transferAll", "widget/Cart Shipping/instances", "--grab", "--node", "http://somehost:8090"])

    expect(self.commander.help).toHaveBeenCalled()
  })

  it("should be able to get last node from disk if you don't supply it on the command line", (done) => {

    self.metadata.getLastNode.returns("http://somehost:8090")

    self.mainModule.main(["unused", "unused", "--transferAll", "widget/Cart Shipping/instances"]).then(
      () => {

        expect(self.endPointTransceiver.init).toHaveBeenCalledWith("http://somehost:8090", "admin", "admin", undefined, undefined)
        expect(self.putter.putAll).toHaveBeenCalledWith("widget/Cart Shipping/instances", "http://somehost:8090")
        done()
      }
    )
  })

  it("should let us specify a base directory", (done) => {

    self.mainModule.main(["unused", "unused", "--put", "widget/Cart Shipping/instances/Cart Shipping/display.template", "--node", "http://somehost:8090", "--base", "some/base/dir"]).then(
      () => {

        expect(self.utils.useBasePath).toHaveBeenCalledWith("some/base/dir")
        expect(self.endPointTransceiver.init).toHaveBeenCalledWith("http://somehost:8090", "admin", "admin", undefined, undefined)
        expect(self.putter.put).toHaveBeenCalledWith("widget/Cart Shipping/instances/Cart Shipping/display.template", "http://somehost:8090", true)
        done()
      }
    )
  })

  it("should let us specify a user name and password", (done) => {

    self.mainModule.main(["unused", "unused", "--put", "widget/Cart Shipping/instances/Cart Shipping/display.template", "--node", "http://somehost:8090", "--username", "fred", "--password", "fred$password"]).then(
      () => {

        expect(self.endPointTransceiver.init).toHaveBeenCalledWith("http://somehost:8090", "fred", "fred$password", undefined, undefined)
        expect(self.putter.put).toHaveBeenCalledWith("widget/Cart Shipping/instances/Cart Shipping/display.template", "http://somehost:8090", true)
        done()
      }
    )
  })

  it("should let us specify a password in the environment", (done) => {

    process.env.CC_ADMIN_PASSWORD = "fred$password"

    self.mainModule.main(["unused", "unused", "--put", "widget/Cart Shipping/instances/Cart Shipping/display.template", "--node", "http://somehost:8090"]).then(
      () => {

        expect(self.endPointTransceiver.init).toHaveBeenCalledWith("http://somehost:8090", "admin", "fred$password", undefined, undefined)
        expect(self.putter.put).toHaveBeenCalledWith("widget/Cart Shipping/instances/Cart Shipping/display.template", "http://somehost:8090", true)
        done()
      }
    )
  })

  it("should let you grab stuff for all locales", (done) => {

    self.mainModule.main(["unused", "unused", "--grab", "--clean", "--node", "http://somehost:8090", "--allLocales"]).then(
      () => {

        expect(self.endPointTransceiver.init).toHaveBeenCalledWith("http://somehost:8090", "admin", "admin", undefined, true)
        expect(self.grabber.grab).toHaveBeenCalledWith("http://somehost:8090", true, true)
        done()
      }
    )
  })
  it("should let you grab stuff for a specific locale", (done) => {

    self.mainModule.main(["unused", "unused", "--grab", "--clean", "--node", "http://somehost:8090", "--locale", "de"]).then(
      () => {

        expect(self.endPointTransceiver.init).toHaveBeenCalledWith("http://somehost:8090", "admin", "admin", "de", undefined)
        expect(self.grabber.grab).toHaveBeenCalledWith("http://somehost:8090", true, true)
        done()
      }
    )
  })
})
