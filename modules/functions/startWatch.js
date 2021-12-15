const appConfig = require("../../config/appconfig.json");
const gmail = require("../gmail");

/**
 * A Google Cloud Function with an HTTP trigger signature, Used to start Gmail Pub/Sub Notifications by calling the Gmail API "users.watch", more details in link below.
 *
 * @param {Object} req The HTTP request object of the HTTP request made
 * @param {Object} res The HTTP response object that will be served for the given request.
 * @see {@link https://developers.google.com/gmail/api/reference/rest/v1/users/watch}
 */
exports.startWatch = async (req, res) => {
    try {
      const authGmail = await gmail.getAuthenticatedGmail();
      var resp = await authGmail.users.stop({
        userId: 'me',
      });
      resp = await authGmail.users.watch({
        userId: 'me',
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
