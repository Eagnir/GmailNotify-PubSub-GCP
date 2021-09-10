const appConfig = require("../../config/appconfig.json");
const storage = require("../storage");
const gmail = require("../gmail");

const ROOT_FOLDER = appConfig.gcp.storage.rootFolderName;
const HISTORY_FILE_PATH = ROOT_FOLDER + appConfig.gcp.storage.historyFilename;
const EMAILS_FOLDER_PATH = ROOT_FOLDER + appConfig.gcp.storage.emailsFolderName;
const DEBUG_FOLDER_PATH = ROOT_FOLDER + appConfig.gcp.storage.debugFolderName;

var GMAIL = null;

exports.ProcessMessage = async (event, context) => {
    const message = event.data
        ? Buffer.from(event.data, 'base64').toString()
        : 'No data provided';
    const msgObj = JSON.parse(message);

    storage.fileExist(HISTORY_FILE_PATH).then(function (data) {
        const exists = data[0];
        if (exists) {
            storage.fetchFileContent(HISTORY_FILE_PATH).then((data) => {
                const prevMsgObj = JSON.parse(data[0]);
                moveForward(prevMsgObj.historyId, msgObj);
            });
        }
        else {
            console.debug("History File Did not Exist");
            storage.saveFileContent(HISTORY_FILE_PATH, JSON.stringify(msgObj));
        }
    });
    console.debug("Function execution completed");
};

async function moveForward(prevHistoryId, msgObj) {
    GMAIL = await gmail.getAuthenticatedGmail();
    storage.saveFileContent(HISTORY_FILE_PATH, JSON.stringify(msgObj));
    fetchMessageFromHistory(prevHistoryId);
}

async function fetchMessageFromHistory(historyId) {
    try {
        const res = await gmail.getHistoryList({
            startHistoryId: historyId,
            userId: 'me',
            labelId: appConfig.gmail.labelsIds[0],
            historyTypes: ["messageAdded"]
        });
        var history = res.data.history;
        if (history != null) {
            if (history.length > 0) {
                // First History
                var msgs = [];
                const messages = history[0].messages;
                for (let index = 0; index < messages.length; index++) { msgs.push(messages[index].id); }
                msgs = msgs.filter((x, i) => i === msgs.indexOf(x)); // Remove duplicates
                for (let index = 0; index < msgs.length; index++) {
                    const messageId = msgs[index];
                    const msg = await gmail.getMessageData(messageId); // Fetch content for each unique message
                    if (msg == null || msg == undefined) {
                        console.error("Message object was null: id: " + messageId);
                        continue;
                    }
                    processEmail(msg, messageId);
                }

            }
        }
        storage.saveFileContent(DEBUG_FOLDER_PATH + historyId + ".json", JSON.stringify(res.data));
        return res.data;
    }
    catch (ex) {
        console.error("ERROR: " + ex);
    }
}

function processEmail(msg, messageId) {
    try {

        const payload = msg.data.payload;
        const headers = payload.headers; // array of header objects containing subject and from values.
        const parts = payload.parts; // array of content (different types, plain, html, etc.)
        if (headers == null || headers == undefined) {
            console.debug("Header is not defined");
            return;
        }
        if (parts == null || parts == undefined) {
            console.debug("Parts is not defined");
            return;
        }

        var email = {
            from: "",
            to: "",
            subject: "",
            snippet: msg.data.snippet,
            bodyText: "",
            bodyHtml: ""
        };

        headers.forEach(header => {
            const name = header.name;
            switch (name) {
                case "To":
                    email.to = header.value;
                    break;
                case "From":
                    email.from = header.value;
                    break;
                case "Subject":
                    email.subject = header.value;
                    break;
            }
        });

        parts.forEach(part => {
            const mimeType = part.mimeType;
            switch (mimeType) {
                case "text/plain":
                    email.bodyText = part.body.data;// Value is Base64 || Buffer.from(part.body.data, 'base64').toString('ascii');
                    break;
                case "text/html":
                    email.bodyHtml = part.body.data;// Value is Base64 || Buffer.from(part.body.data, 'base64').toString('ascii');
                    break;
            }
        });
        storage.saveFileContent(DEBUG_FOLDER_PATH + messageId + "_msg.json", JSON.stringify(msg));
        storage.saveFileContent(EMAILS_FOLDER_PATH + messageId + "_email.json", JSON.stringify(email));

        var fromName = email.from.split("<")[0].trim();
        var notificationText = fromName + ": " + email.subject + "\n\n" + email.snippet;

        const p = require('phin');
        p({
            url: appConfig.slack.webhookUrl,
            method: 'POST',
            headers: {
                "Content-type": "application/json"
            },
            data: { text: notificationText }
        });
        console.debug("Message notification sent!: " + email.from);
    }
    catch (ex) {
        console.error("process email error: " + ex);
    }
}