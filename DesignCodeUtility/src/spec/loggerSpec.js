"use strict"

const mockery = require('./mockery')

describe("logger", () => {

  const self = this

  beforeEach(() => {

    mockery.use(jasmine.createSpy)

    self.i18n = mockery.mockModule('../i18n')
    self.colors = mockery.mockModule('colors/safe')

    self.i18n.t.returnsFirstArg()

    console.log = jasmine.createSpy("log")

    self.logger = mockery.require("../logger")
  })

  afterEach(mockery.stopAll)

  it("should log info messages", () => {

    self.logger.info("someKey")

    expect(console.log).toHaveBeenCalledWith("someKey")
  })

  it("should log warning messages", () => {

    self.colors.magenta = {
      bold : mockery.addConvenienceMethods(jasmine.createSpy("bold"))
    }

    self.colors.magenta.bold.returnsFirstArg()

    self.logger.warn("anotherKey")

    expect(console.log).toHaveBeenCalledWith("anotherKey")
    expect(self.colors.magenta.bold).toHaveBeenCalledWith("anotherKey")
  })

  it("should log error messages", () => {

    self.colors.red = {
      bold : mockery.addConvenienceMethods(jasmine.createSpy("bold"))
    }

    self.colors.red.bold.returnsFirstArg()

    self.logger.error("yetAnotherKey")

    expect(console.log).toHaveBeenCalledWith("yetAnotherKey")
    expect(self.colors.red.bold).toHaveBeenCalledWith("yetAnotherKey")
  })
})
