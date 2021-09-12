const gmail = require("../gmail");

/**
 * A Google Cloud Function with an HTTP trigger signature, Used to stop Gmail from sending Pub/Sub Notifications by calling the Gmail API "users.stop", more details in link below.
 *
 * @param {Object} req The HTTP request object of the HTTP request made
 * @param {Object} res The HTTP response object that will be served for the given request.
 * @see {@link https://developers.google.com/gmail/api/reference/rest/v1/users/stop}
 */
exports.stopWatch = async (req, res) => {
    try {
      const authGmail = await gmail.getAuthenticatedGmail();
      const resp = await authGmail.users.stop({
        userId: 'me',
      });
      res.status(200).send("Successfully Stop Watching - " + JSON.stringify(resp));
    }
    catch(ex) {
      res.status(500).send("Error occured: " + ex);
      throw new Error("Error occured while stopping gmail watch: " + ex);
    }
  };
  