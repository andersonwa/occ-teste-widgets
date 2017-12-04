"use strict"

const constants = require("../constants").constants
const mockery = require("./mockery")

const PuttingFileType = require("../classifier").PuttingFileType

describe("Putter", () => {

  const self = this

  const themeStylesPath = "theme/Mono Theme/styles.less"

  beforeEach((done) => {

    mockery.use(jasmine.createSpy)

    mockery.mockModules(self, "walk", "../utils", "../metadata", "../logger", "../themePutter", "../endPointTransceiver")

    self.putter = mockery.require("../putter")

    self.metadata.readMetadata.returnsPromise(
      {
        node : "http://localhost:8080"
      })

    self.metadata.initializeMetadata.returnsPromise()

    self.utils.normalize.returnsFirstArg()

    self.utils.exists.returnsTrue()

    setTimeout(() => {
      done()
    }, 1)
  })

  afterEach(mockery.stopAll)

  it("should let you put a file on the server", (done) => {

    self.putter.put(themeStylesPath, "http://localhost:8080").then(
      () => {

        expect(self.logger.info).toHaveBeenCalledWith("sendingPath", {
          path : themeStylesPath,
          node : "http://localhost:8080"
        })
        expect(self.themePutter.putThemeStyles).toHaveBeenCalled()
        done()
      }
    )
  })

  it("should detect server mismatches", (done) => {

    self.metadata.readMetadata.returnsPromise(
      {
        node : "http://someOtherServer:8080"
      })

    self.putter.put(themeStylesPath, "http://localhost:8080").then(
      () => {

        expect(self.logger.error).toHaveBeenCalledWith("cannotSendToDifferentNode", {
          path : themeStylesPath,
          node : "http://localhost:8080",
          configMetadataNode : "http://someOtherServer:8080"
        }, "Invalid Operation")
        done()
      }
    )
  })

  it("should detect non-existent files", () => {

    self.utils.exists.returnsFalse()

    self.putter.put(themeStylesPath, "http://localhost:8080")

    expect(self.logger.error).toHaveBeenCalledWith("pathDoesNotExist", {path : 'theme/Mono Theme/styles.less'})
  })

  it("should detect non-existent directories", () => {

    self.utils.exists.returnsFalse()

    self.putter.putAll("theme/Mono Theme", "http://localhost:8080")

    expect(self.logger.error).toHaveBeenCalledWith("pathDoesNotExist", {path : 'theme/Mono Theme'})
  })

  it("should let you send an entire directory to the server", (done) => {

    self.walk.walk.returns({
      on : (type, callback) => {

        callback("/workspace/theme/Even Darker Theme", {name : "styles.less"}, () => {
        })

        return {
          on : (type, callback) => {
            callback().then(
              () => {
                expect(self.themePutter.putTheme).toHaveBeenCalled()
                done()
              }
            )
          }
        }
      }
    })

    self.putter.putAll("theme/Mono Theme", "http://localhost:8080")
  })

  it("should detect attempts to transfer a server to itself", (done) => {

    self.metadata.inTransferMode.returnsTrue()

    self.metadata.readMetadata.returnsPromise(
      {
        node : "http://localhost:8080",
        commerceCloudVersion : "16.5"
      })

    self.endPointTransceiver.commerceCloudVersion = "16.5"

    self.putter.put(themeStylesPath, "http://localhost:8080").then(
      () => {

        expect(self.logger.error).toHaveBeenCalledWith("cannotSendToSameNode", {
          path : themeStylesPath,
          node : "http://localhost:8080"
        })
        done()
      }
    )
  })

  it("should detect attempts to transfer between two different versions", (done) => {

    self.metadata.inTransferMode.returnsTrue()
    self.metadata.readMetadata.returnsPromise(
      {
        node : "http://localhost:8080",
        commerceCloudVersion : "16.6"
      })
    self.endPointTransceiver.commerceCloudVersion = "16.5"

    self.putter.put(themeStylesPath, "http://someOtherHost:8080").then(
      () => {

        expect(self.logger.error).toHaveBeenCalledWith("cannotSendToDifferentVersion", {
          path : themeStylesPath,
          node : "http://someOtherHost:8080",
          configMetadataNode : "http://localhost:8080",
          configMetadataVersion : "16.6",
          targetVersion : "16.5"
        })
        done()
      }
    )
  })
})
