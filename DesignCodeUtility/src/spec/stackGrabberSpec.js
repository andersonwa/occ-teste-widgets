const constants = require("../constants").constants
const mockery = require("./mockery")

describe("Stack Grabber", () => {

  const self = this

  beforeEach(() => {

    mockery.use(jasmine.createSpy)

    self.endPointTransceiver = mockery.mockModule("../endPointTransceiver", "getAllStackInstances")

    mockery.mockModules(self, "../utils", "../grabberUtils", "../metadata", "../logger")

    self.utils.sanitizeName.returnsFirstArg()

    self.stackGrabber = mockery.require("../stackGrabber")
  })

  afterEach(mockery.stopAll)

  it("should stop you if the server does not support the right endpoints", () => {

    self.endPointTransceiver.serverSupports.returnsFalse()

    self.stackGrabber.grabAllStacks()

    expect(self.logger.warn).toHaveBeenCalledWith("stacksCannotBeGrabbed")
  })

  it("should let you grab all Application JavaScript", (done) => {

    self.endPointTransceiver.serverSupports.returnsTrue()

    self.endPointTransceiver.getAllStackInstances.returnsItems(
      {
        displayName : "My Big Stack",
        instances : [
          {
            displayName : "My Big Stack Instance Display Name",
            id : "myBigStackId"
          }
        ]
      }
    )

    self.stackGrabber.grabAllStacks().then(
      () => {

        expect(self.utils.makeTrackedDirectory).toHaveBeenCalledWith(constants.stacksDir)
        expect(self.utils.makeTrackedDirectory).toHaveBeenCalledWith("stack/My Big Stack")
        expect(self.utils.makeTrackedDirectory).toHaveBeenCalledWith("stack/My Big Stack/instances")
        expect(self.utils.makeTrackedDirectory).toHaveBeenCalledWith("stack/My Big Stack/instances/My Big Stack Instance Display Name")

        expect(self.logger.info).toHaveBeenCalledWith('grabbingStack', {name : 'My Big Stack'})

        expect(self.metadata.writeMetadata).toHaveBeenCalledWith("stack/My Big Stack/instances/My Big Stack Instance Display Name/stackInstance.json",
          {repositoryId : "myBigStackId", displayName : "My Big Stack Instance Display Name"})

        expect(self.grabberUtils.copyFieldContentsToFile).toHaveBeenCalledWith("getStackSourceCode", "myBigStackId", "source", "stack/My Big Stack/instances/My Big Stack Instance Display Name/stack.template")
        expect(self.grabberUtils.copyFieldContentsToFile).toHaveBeenCalledWith("getStackLessVars", "myBigStackId", "source", "stack/My Big Stack/instances/My Big Stack Instance Display Name/stack-variables.less")
        expect(self.grabberUtils.copyFieldContentsToFile).toHaveBeenCalledWith("getStackLess", "myBigStackId", "source", "stack/My Big Stack/instances/My Big Stack Instance Display Name/stack.less")
        done()
      }
    )
  })
})
