const gmail = require("../gmail");

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
    }
  };
  