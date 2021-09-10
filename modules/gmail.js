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

exports.getAuthenticatedGmail = async () => {
    try {
        if (Authenticated_Gmail != null)
            return Authenticated_Gmail;
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

exports.getHistoryList = async (options) => {
    try {
        await this.getAuthenticatedGmail();
        return Authenticated_Gmail.users.history.list(options);
    }
    catch (ex) {
        console.error("history list error: " + ex);
        throw ex;
    }
}

exports.getMessageData = async (messageId) => {
    try {
        await this.getAuthenticatedGmail();
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