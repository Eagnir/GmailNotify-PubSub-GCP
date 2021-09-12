const appConfig = require("../config/appconfig.json");
const { google } = require('googleapis');

const GoogleKeyFile = appConfig.gcp.auth.googleKeyFilePath;
const AuthJWTSubject = appConfig.gcp.auth.subject;

const SCOPES = appConfig.gmail.scopes;

const JWT = google.auth.JWT;
const authClient = new JWT({
    keyFile: GoogleKeyFile,
    scopes: SCOPES,
    subject: AuthJWTSubject
});

var Authenticated_Gmail = null;

/**
 * Gets the authenticated Gmail API if already authenticated else performs an authentication
 *
 * @return {google.gmail} with the authClient attached and ready to call Gmail API 
 */
async function getAuthenticatedGmail() {
    try {
        if (Authenticated_Gmail != null){
            console.log("Skipping authentication call");
            return Authenticated_Gmail;
        }
        console.log("Authentication call executed");
        await authClient.authorize();
        Authenticated_Gmail = google.gmail({
            auth: authClient,
            version: 'v1'
        });
        return Authenticated_Gmail;
    }
    catch (ex) {
        throw ex;
    }
} 

exports.getAuthenticatedGmail = getAuthenticatedGmail;

/**
 * Performs the Gmail API call to users.history.list Endpoint
 *
 * @param {*} options Query parameters as per the Gmail API documentation link below.
 * @return {Promise} A Promise that will resolve with the history data based on the options provided 
 * @see {@link https://developers.google.com/gmail/api/reference/rest/v1/users.history/list}
 */
exports.getHistoryList = async (options) => {
    try {
        await getAuthenticatedGmail();
        return Authenticated_Gmail.users.history.list(options);
    }
    catch (ex) {
        console.error("history list error: " + ex);
        throw ex;
    }
}

/**
 * Performs the Gmail API call to users.messages.get Endpoint
 *
 * @param {String} messageId  The message ID for which details (data) is required
 * @return {Promise} A Promise that will resolve with the message details (data) for the given message ID
 * @see {@link https://developers.google.com/gmail/api/reference/rest/v1/users.messages/get} 
 */
exports.getMessageData = async (messageId) => {
    try {
        await getAuthenticatedGmail();
        return Authenticated_Gmail.users.messages.get({
            userId: 'me',
            id: messageId
        });
    }
    catch (ex) {
        console.error("msg data error: " + ex);
        throw ex;
    }
}