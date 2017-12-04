const constants = require("../constants").constants
const mockery = require("./mockery")

describe("Theme Putter", () => {

  const self = this

  const themeAdditionalStylesPath = "theme/Even Darker Theme/additionalStyles.less"
  const themeStylesPath = "theme/Mono Theme/styles.less"
  const themeVariablesPath = "theme/Mono Theme/variables.less"
  const additionalStylesPathForMissingTheme = "theme/Missing Theme/additionalStyles.less"

  beforeEach(() => {

    mockery.use(jasmine.createSpy)

    self.endPointTransceiver = mockery.mockModule("../endPointTransceiver",
      "updateThemeSource", "getThemes", "cloneTheme")

    mockery.mockModules(self, "../putterUtils", "../utils", "../etags", "../metadata", "../logger")

    self.themePutter = mockery.require("../themePutter")
  })

  afterEach(mockery.stopAll)

  it("should let you send theme additional styles back", (done) => {

    const results = self.endPointTransceiver.updateThemeSource.returnsResponse({}, "theme source etag")
    self.metadata.readMetadata.returnsPromise({"repositoryId" : "monoTheme", etag : "THEME_ETAG"})
    self.putterUtils.processPutResult.returnsTrue()

    self.themePutter.putThemeAdditionalStyles(themeAdditionalStylesPath).then(
      () => {

        expect(self.endPointTransceiver.updateThemeSource.calls.mostRecent().args[0]).toEqual(["monoTheme"])
        const requestBuilder = self.endPointTransceiver.updateThemeSource.calls.mostRecent().args[1]
        expect(requestBuilder.path).toEqual(themeAdditionalStylesPath)
        expect(requestBuilder.field).toEqual("additionalStyles")
        expect(requestBuilder.etag).toEqual("THEME_ETAG")

        expect(self.putterUtils.processPutResult).toHaveBeenCalledWith(themeAdditionalStylesPath, results)
        expect(self.etags.writeEtag).toHaveBeenCalledWith("theme/Even Darker Theme/variables.less", "theme source etag")
        expect(self.etags.writeEtag).toHaveBeenCalledWith("theme/Even Darker Theme/styles.less", "theme source etag")
        expect(self.etags.writeEtag).toHaveBeenCalledWith("theme/Even Darker Theme/additionalStyles.less", "theme source etag")
        done()
      }
    )
  })

  it("should let you send theme additional styles back", (done) => {

    const results = self.endPointTransceiver.updateThemeSource.returnsResponse({}, "theme source etag")
    self.metadata.readMetadata.returnsPromise({"repositoryId" : "monoTheme", etag : "THEME_ETAG"})
    self.putterUtils.processPutResult.returnsTrue()

    self.themePutter.putThemeStyles(themeStylesPath).then(
      () => {
        expect(self.putterUtils.processPutResult).toHaveBeenCalledWith(themeStylesPath, results)
        done()
      })
  })

  it("should let you send theme variables back", (done) => {

    const results = self.endPointTransceiver.updateThemeSource.returnsResponse({}, "theme source etag")
    self.metadata.readMetadata.returnsPromise({"repositoryId" : "monoTheme", etag : "THEME_ETAG"})
    self.putterUtils.processPutResult.returnsTrue()

    self.themePutter.putThemeVariables(themeVariablesPath).then(
      () => {
        expect(self.putterUtils.processPutResult).toHaveBeenCalledWith(themeVariablesPath, results)
        done()
      })
  })

  it("should warn you when you try to send back a non-existent theme", (done) => {

    self.metadata.readMetadata.returnsPromise(null)

    self.themePutter.putThemeStyles(additionalStylesPathForMissingTheme).then(
      () => {

        expect(self.logger.warn).toHaveBeenCalledWith("cannotUpdateTheme", {path : additionalStylesPathForMissingTheme})
        done()
      }
    )
  })

  it("should let you send back an entire theme", (done) => {

    self.metadata.readMetadata.returnsPromise({
      "repositoryId" : "veryPurpleTheme",
      "etag" : "old theme source etag"
    })
    const results = self.endPointTransceiver.updateThemeSource.returnsResponse({}, "theme source etag")
    self.putterUtils.processPutResult.returnsTrue()
    self.utils.readFile.returns("some theme code")

    self.themePutter.putTheme("theme/Very Purple Theme").then(
      () => {

        expect(self.endPointTransceiver.updateThemeSource.calls.mostRecent().args[0]).toEqual(["veryPurpleTheme"])
        const requestBuilder = self.endPointTransceiver.updateThemeSource.calls.mostRecent().args[1]
        expect(requestBuilder.etag).toEqual("old theme source etag")
        expect(requestBuilder.body).toEqual({
          styles : "some theme code",
          additionalStyles : "some theme code",
          variables : "some theme code"
        })

        expect(self.putterUtils.processPutResult).toHaveBeenCalledWith("theme/Very Purple Theme", results)
        expect(self.etags.writeEtag).toHaveBeenCalledWith("theme/Very Purple Theme/styles.less", "theme source etag")
        expect(self.etags.writeEtag).toHaveBeenCalledWith("theme/Very Purple Theme/additionalStyles.less", "theme source etag")
        expect(self.etags.writeEtag).toHaveBeenCalledWith("theme/Very Purple Theme/variables.less", "theme source etag")
        done()
      }
    )
  })

  it("should let you create a Theme in transfer mode", (done) => {

    self.metadata.inTransferMode.returnsTrue()
    self.metadata.readMetadata.returnsPromise(null)
    self.endPointTransceiver.getThemes.returnsItems({repositoryId : "themeToBeClonedRepoId"})
    self.endPointTransceiver.cloneTheme.returnsResponse({repositoryId : "newThemeRepoId"})
    const results = self.endPointTransceiver.updateThemeSource.returnsResponse({}, "theme source etag")
    self.putterUtils.processPutResult.returnsTrue()
    self.utils.readFile.returns("some theme code")

    self.themePutter.putTheme("theme/New Purple Theme").then(
      () => {

        expect(self.endPointTransceiver.updateThemeSource.calls.mostRecent().args[0]).toEqual(["newThemeRepoId"])
        const requestBuilder = self.endPointTransceiver.updateThemeSource.calls.mostRecent().args[1]
        expect(requestBuilder.etag).toEqual(undefined)
        expect(requestBuilder.body).toEqual(
          {styles : "some theme code", additionalStyles : "some theme code", variables : "some theme code"})

        expect(self.etags.writeEtag).not.toHaveBeenCalled()
        done()
      }
    )
  })

  it("should stop you creating a Theme when there is no metadata and not in transfer mode", (done) => {

    self.metadata.readMetadata.returnsPromise(null)

    self.themePutter.putTheme("theme/Very New Theme").then(
      () => {

        expect(self.logger.warn).toHaveBeenCalledWith("cannotUpdateTheme", {path : "theme/Very New Theme"})
        done()
      }
    )
  })
})
