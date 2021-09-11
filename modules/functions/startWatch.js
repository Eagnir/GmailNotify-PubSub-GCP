const appConfig = require("../../config/appconfig.json");
const gmail = require("../gmail");

exports.startWatch = async (req, res) => {
    try {
      const authGmail = await gmail.getAuthenticatedGmail();
      const resp = await authGmail.users.watch({
        'userId': 'me',
        topicName: appConfig.gcp.pubsub.topic,
        labelIds: appConfig.gmail.labelsIds,
        labelFilterAction: appConfig.gmail.filterAction
      });
      res.status(200).send("Successfully Started Watching - " + JSON.stringify(resp));
    }
    catch(ex) {
      res.status(500).send("Error occured: " + ex);
      throw new Error("Error occured while starting gmail watch: " + ex);
    }
  };
  