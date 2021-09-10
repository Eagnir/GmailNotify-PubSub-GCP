const ProcessMessageFunc = require("./modules/functions/processMessage");
const StartWatchFunc = require("./modules/functions/startWatch");
const StopWatchFunc = require("./modules/functions/stopWatch");


exports.processMessage = ProcessMessageFunc.ProcessMessage;
exports.startWatch = StartWatchFunc.startWatch;
exports.stopWatch = StopWatchFunc.stopWatch;