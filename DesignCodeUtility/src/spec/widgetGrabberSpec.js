"use strict"

const constants = require("../constants").constants
const mockery = require("./mockery")

describe("Widget Grabber", () => {

  const self = this

  beforeEach(() => {

    mockery.use(jasmine.createSpy)

    self.endPointTransceiver = mockery.mockModule("../endPointTransceiver",
      "getAllWidgetInstances", "getWidgetDescriptorJavascriptInfoById", "getWidgetLocaleContent", "listWidgets")

    self.endPointTransceiver.locales = [{name : "en"}]

    mockery.mockModules(self, "../utils", "../grabberUtils", "../etags", "../metadata", "../logger")

    self.utils.sanitizeName.returnsFirstArg()

    self.widgetGrabber = mockery.require("../widgetGrabber")

    self.endPointTransceiver.getWidgetLocaleContent.returnsResponse(
      {
        localeData : {
          resources,
          custom : {
            "overrideKey" : "Should see this"
          }
        }
      }, "widget locale content etag")

    self.grabberUtils.copyFieldContentsToFile.returnsPromise()

    self.endPointTransceiver.getWidgetDescriptorJavascriptInfoById.returnsResponse(
      {
        jsFiles : [
          {
            name : "myLittle.js"
          }
        ]
      })

    self.endPointTransceiver.get.returnsResponse("some widget js source", "get js etag")
  })

  afterEach(mockery.stopAll)

  const resources = {
    "buttonEditCartSummary" : "Edit",
    "cartSummaryItemLimitText" : "Showing initial __noOfItems__ cart items",
    "colorText" : "Color: ",
    "overrideKey" : "Should not see this"
  }

  it("should let you grab all Widgets", (done) => {

    self.endPointTransceiver.getAllWidgetInstances.returnsItems(
      {
        displayName : "My Little Widget",
        widgetType : "myLittleWidgetType",
        editableWidget : true,
        jsEditable : true,
        repositoryId : "rep0001",
        id : "rep0001",
        version : 1,
        instances : []
      }
    )

    self.endPointTransceiver.listWidgets.returnsItems(
      {
        displayName : "My Little Widget Instance",
        repositoryId : "rep0002",
        id : "rep0002",
        descriptor : {
          widgetType : "myLittleWidgetType",
          repositoryId : "rep0001",
          version : 3
        }
      },
      {
        displayName : "My Little Widget Instance",
        repositoryId : "rep0003",
        id : "rep0003",
        descriptor : {
          widgetType : "myLittleWidgetType",
          repositoryId : "rep0001",
          version : 2
        }
      }
    )

    // First call to exists must return false. All later calls must return true.
    let calls = 0
    self.utils.exists.and.callFake(() => {
      return calls++
    })

    self.metadata.readMetadataFromDisk.and.callFake(() => {
      return {
        version : 3
      }
    })

    self.widgetGrabber.grabAllWidgets(true).then(
      () => {

        expect(self.endPointTransceiver.getAllWidgetInstances).toHaveBeenCalledWith("?source=100")
        expect(self.endPointTransceiver.getAllWidgetInstances).toHaveBeenCalledWith("?source=101")
        expect(self.endPointTransceiver.listWidgets).toHaveBeenCalled()

        expect(self.endPointTransceiver.getWidgetDescriptorJavascriptInfoById).toHaveBeenCalledWith(["rep0001"])

        expect(self.endPointTransceiver.getWidgetLocaleContent.calls.mostRecent().args[0]).toEqual(["rep0002"])
        expect(self.endPointTransceiver.getWidgetLocaleContent.calls.mostRecent().args[1].locale).toEqual("en")

        expect(self.utils.makeTrackedDirectory).toHaveBeenCalledWith("widget")
        expect(self.utils.makeTrackedDirectory).toHaveBeenCalledWith("widget/My Little Widget")
        expect(self.utils.makeTrackedDirectory).toHaveBeenCalledWith("widget/My Little Widget/js")
        expect(self.utils.makeTrackedDirectory).toHaveBeenCalledWith("widget/My Little Widget/instances")
        expect(self.utils.makeTrackedTree).toHaveBeenCalledWith("widget/My Little Widget/instances/My Little Widget Instance")
        expect(self.utils.makeTrackedDirectory).toHaveBeenCalledWith("widget/My Little Widget/instances/My Little Widget Instance/locales")
        expect(self.utils.makeTrackedDirectory).toHaveBeenCalledWith("widget/My Little Widget/instances/My Little Widget Instance/locales/en")

        expect(self.utils.writeFile).toHaveBeenCalledWith("widget/My Little Widget/instances/My Little Widget Instance/locales/en/ns.mylittlewidgettype.json", JSON.stringify(
          {
            "buttonEditCartSummary" : "Edit",
            "cartSummaryItemLimitText" : "Showing initial __noOfItems__ cart items",
            "colorText" : "Color: ",
            "overrideKey" : "Should see this"
          }, null, 2))

        expect(self.etags.writeEtag).toHaveBeenCalledWith("widget/My Little Widget/instances/My Little Widget Instance/locales/en/ns.mylittlewidgettype.json", "widget locale content etag")

        expect(self.grabberUtils.writeFileAndETag).toHaveBeenCalledWith("widget/My Little Widget/js/myLittle.js", "some widget js source", "get js etag")

        expect(self.metadata.writeMetadata).toHaveBeenCalledWith("widget/My Little Widget/widget.json",
          {repositoryId : "rep0001", widgetType : "myLittleWidgetType", version : 1, displayName : "My Little Widget"})
        expect(self.metadata.writeMetadata).toHaveBeenCalledWith("widget/My Little Widget/instances/My Little Widget Instance/widgetInstance.json",
          {repositoryId : "rep0002", descriptorRepositoryId: "rep0001", version: 3, displayName : "My Little Widget Instance"})

        expect(self.grabberUtils.copyFieldContentsToFile).toHaveBeenCalledWith("getWidgetSourceCode", "rep0002", "source", "widget/My Little Widget/instances/My Little Widget Instance/display.template")
        expect(self.grabberUtils.copyFieldContentsToFile).toHaveBeenCalledWith("getWidgetLess", "rep0002", "source", "widget/My Little Widget/instances/My Little Widget Instance/widget.less", constants.lessFileSubstitutionReqExp, "#WIDGET_ID-WIDGET_INSTANCE_ID")

        expect(self.logger.info).toHaveBeenCalledWith("grabbingWidget", {name : "My Little Widget"})
        expect(self.logger.info).toHaveBeenCalledWith("grabbingWidgetInstance", {name : "My Little Widget Instance"})

        // See if the directory map is right. Simple case - latest widget.
        expect(self.widgetGrabber.getDirectoryForWidget("myLittleWidgetType", 3, true)).toEqual("widget/My Little Widget")

        // More complex case - not latest version. Make sure dirs got created.
        expect(self.widgetGrabber.getDirectoryForWidget("myLittleWidgetType", 1, false)).toEqual("widget/My Little Widget/versions/1")
        expect(self.utils.makeTrackedDirectory).toHaveBeenCalledWith("widget/My Little Widget/versions")
        expect(self.utils.makeTrackedDirectory).toHaveBeenCalledWith("widget/My Little Widget/versions/1")

        done()
      }
    )
  })

  it("should let you grab Web Content Widgets", (done) => {

    self.endPointTransceiver.getAllWidgetInstances.returnsItems(
      {
        displayName : "My Little Web Content Widget",
        widgetType : "webContent",
        editableWidget : true,
        jsEditable : false,
        repositoryId : "rep0001",
        version : 3,
        instances : [
          {
            displayName : "My Little Web Content Widget Instance",
            repositoryId : "rep0002",
            id : "rep0002",
            version : 3
          }
        ]
      }
    )

    self.endPointTransceiver.listWidgets.returnsItems(
      {
        displayName : "My Little Web Content Widget Instance",
        repositoryId : "rep0002",
        id : "rep0002",
        descriptor : {
          widgetType : "webContent",
          repositoryId : "rep0001",
          version : 3
        }
      }
    )

    self.widgetGrabber.grabAllWidgets(true).then(
      () => {

        expect(self.endPointTransceiver.getAllWidgetInstances).toHaveBeenCalledWith("?source=100")
        expect(self.endPointTransceiver.getAllWidgetInstances).toHaveBeenCalledWith("?source=101")
        expect(self.endPointTransceiver.listWidgets).toHaveBeenCalled()

        expect(self.endPointTransceiver.getWidgetLocaleContent.calls.mostRecent().args[0]).toEqual(["rep0002"])
        expect(self.endPointTransceiver.getWidgetLocaleContent.calls.mostRecent().args[1].locale).toEqual("en")

        expect(self.utils.makeTrackedDirectory).toHaveBeenCalledWith("widget")
        expect(self.utils.makeTrackedDirectory).toHaveBeenCalledWith("widget/My Little Web Content Widget")
        expect(self.utils.makeTrackedDirectory).not.toHaveBeenCalledWith("widget/My Little Web Content Widget/js")
        expect(self.utils.makeTrackedDirectory).toHaveBeenCalledWith("widget/My Little Web Content Widget/instances")
        expect(self.utils.makeTrackedTree).toHaveBeenCalledWith("widget/My Little Web Content Widget/instances/My Little Web Content Widget Instance")
        expect(self.utils.makeTrackedDirectory).toHaveBeenCalledWith("widget/My Little Web Content Widget/instances/My Little Web Content Widget Instance/locales")
        expect(self.utils.makeTrackedDirectory).toHaveBeenCalledWith("widget/My Little Web Content Widget/instances/My Little Web Content Widget Instance/locales/en")

        expect(self.utils.writeFile).toHaveBeenCalledWith("widget/My Little Web Content Widget/instances/My Little Web Content Widget Instance/locales/en/ns.webcontent.json", JSON.stringify(resources, null, 2))

        expect(self.etags.writeEtag).toHaveBeenCalledWith("widget/My Little Web Content Widget/instances/My Little Web Content Widget Instance/locales/en/ns.webcontent.json", "widget locale content etag")

        expect(self.grabberUtils.writeFileAndETag).not.toHaveBeenCalledWith("widget/My Little Widget/js/myLittle.js", "some widget js source", "get js etag")

        expect(self.metadata.writeMetadata).toHaveBeenCalledWith("widget/My Little Web Content Widget/widget.json",
          {
            repositoryId : "rep0001",
            widgetType : "webContent",
            version : 3,
            displayName : "My Little Web Content Widget"
          })
        expect(self.metadata.writeMetadata).toHaveBeenCalledWith("widget/My Little Web Content Widget/instances/My Little Web Content Widget Instance/widgetInstance.json",
          {repositoryId : "rep0002", descriptorRepositoryId : "rep0001", version: 3, displayName : "My Little Web Content Widget Instance"})

        expect(self.grabberUtils.copyFieldContentsToFile).toHaveBeenCalledWith("getWidgetSourceCode", "rep0002", "source", "widget/My Little Web Content Widget/instances/My Little Web Content Widget Instance/display.template")
        expect(self.grabberUtils.copyFieldContentsToFile).toHaveBeenCalledWith("getWidgetWebContent", "rep0002", "content", "widget/My Little Web Content Widget/instances/My Little Web Content Widget Instance/content.template")
        expect(self.grabberUtils.copyFieldContentsToFile).toHaveBeenCalledWith("getWidgetLess", "rep0002", "source", "widget/My Little Web Content Widget/instances/My Little Web Content Widget Instance/widget.less", constants.lessFileSubstitutionReqExp, "#WIDGET_ID-WIDGET_INSTANCE_ID")

        done()
      }
    )
  })
})
