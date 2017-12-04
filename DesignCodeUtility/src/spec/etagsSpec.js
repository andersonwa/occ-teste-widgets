"use strict"

const mockery = require('./mockery')

describe("etags", () => {

  const self = this

  beforeEach(() => {

    mockery.use(jasmine.createSpy)

    mockery.mockModules(self, "../utils", "fs", "path")

    console.log = jasmine.createSpy("log")

    self.etags = mockery.require("../etags")
  })

  afterEach(mockery.stopAll)

  it("should let you dump etags", () => {

    self.etags.dumpEtag(new Buffer("some text"))

    expect(console.log).toHaveBeenCalledWith("some text")
  })
})
