const program = require("commander")

const endPointTransceiver = require("./endPointTransceiver")
const getLastNode = require("./metadata").getLastNode
const grabber = require("./grabber")
const metadata = require("./metadata")
const putter = require("./putter")
const t = require("./i18n").t
const useBasePath = require("./utils").useBasePath

exports.main = function (argv) {

  // Force use of dcu rather than the actual file name of index.js.
  program._name = "dcu"

  program
    .version("0.0.2")
    .option("-n, --node <node>", t("nodeOptionText"))
    .option("-u, --username <userName>", t("usernameOptionText"), "admin")
    .option("-p, --password <password>", t("passwordOptionText"), "admin")
    .option("-g, --grab", t("grabOptionText"), false)
    .option("-m, --putAll <directory>", t("putAllOptionText"), false)
    .option("-x, --transferAll <directory>", t("transferAllOptionText"), false)
    .option("-t, --put <file>", t("putOptionText"))
    .option("-b, --base <directory>", t("baseOptionText"))
    .option("-l, --locale <locale>", t("localeOptionText"))
    .option("-a, --allLocales", t("allLocalesOptionText"))
    .option("-c, --clean", t("cleanOptionText"))
    .parse(argv)

  // Pass on the base path if it was set.
  if (program.base) {
    useBasePath(program.base)
  }

  // Must have exactly one operation - no more and no less.
  const operationsCount = ["grab", "put", "putAll", "transferAll"].reduce((total, currentValue) => total + (program[currentValue] ? 1 : 0), 0);

  // Some operations are only OK with a grab.
  const needsAGrab = (program.clean || program.allLocales) && !program.grab

  // Make sure we know which server we are working with. If the user did not supply a node, try to use the last one.
  if (!program.node) {
    program.node = getLastNode(program.put || program.putAll || program.transferAll)
  }

  // Something is not quite right - tell the user.
  if (operationsCount !== 1 || needsAGrab || !program.node) {
    program.help()
    return
  }

  // Password passed by environment variable trumps the command line.
  const password = process.env.CC_ADMIN_PASSWORD ? process.env.CC_ADMIN_PASSWORD : program.password

  // Sort out our endpoints first.
  return endPointTransceiver.init(program.node, program.username, password, program.locale, program.allLocales).then(
    () => {

      if (program.grab) {
        grabber.grab(program.node, program.clean, true)
      } else if (program.put) {
        putter.put(program.put, program.node, true)
      } else if (program.putAll) {
        putter.putAll(program.putAll, program.node)
      } else if (program.transferAll) {
        metadata.inTransferMode(true)
        putter.putAll(program.transferAll, program.node)
      }
    })
}
