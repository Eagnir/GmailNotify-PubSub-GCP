const appConfig = require("../../config/appconfig.json");
const storage = require("../storage");
const gmail = require("../gmail");

const ROOT_FOLDER = appConfig.gcp.storage.rootFolderName;
const HISTORY_FILE_PATH = ROOT_FOLDER + appConfig.gcp.storage.historyFilename;
const EMAILS_FOLDER = ROOT_FOLDER + appConfig.gcp.storage.emailsFolderName;
const DEBUG_FOLDER = ROOT_FOLDER + appConfig.gcp.storage.debugFolderName;

var GMAIL = null;

/**
 * A Google Cloud Function with an Pub/Sub trigger signature.
 *
 * @param {Object} event The Pub/Sub message
 * @param {Object} context The event metadata
 * @return {Promise} A Promise so the GCP function does not stop execution till the returned promise is resolved or gets rejected. 
 */
exports.ProcessMessage = async (event, context) => {
    try 
    {
        const message = event.data
            ? Buffer.from(event.data, 'base64').toString()
            : 'No data provided';
        const msgObj = JSON.parse(message);

        return storage.fileExist(HISTORY_FILE_PATH).then(async function (exists) {
            if (exists) {
                await storage.fetchFileContent(HISTORY_FILE_PATH).then(async (data) => {
                    const prevMsgObj = JSON.parse(data[0]);
                    await moveForward(prevMsgObj.historyId, msgObj);
                });
            }
            else {
                console.debug("History File Did not Exist");
                await storage.saveFileContent(HISTORY_FILE_PATH, JSON.stringify(msgObj));
            }
            console.debug("Function execution completed");
        });
    }
    catch(ex) {
        throw new Error("Error occured while processing message: " + ex);   
    }
};

/**
 * A helper function to further process the previous history id and save the current Message Object for the next run's previous history id
 *
 * @param {String} prevHistoryId Previous history id which will be queried for the latest messages
 * @param {Object} msgObj The current message object containing the new history id
 */
async function moveForward(prevHistoryId, msgObj) {
    GMAIL = await gmail.getAuthenticatedGmail();
    storage.saveFileContent(HISTORY_FILE_PATH, JSON.stringify(msgObj));
    await fetchMessageFromHistory(prevHistoryId);
}

/**
 * Function to fetch the messages/updates starting from the given history id, then continue to process the received updates to identify the messages that needs to be send to the external webhook
 *
 * @param {String} historyId
 * @return {Object} Returns the list of updates from the given history id
 * @see {@link gmail.getHistoryList}
 */
async function fetchMessageFromHistory(historyId) {
    try {
        console.time("getHistoryList");
        const res = await gmail.getHistoryList({
            startHistoryId: historyId,
            userId: 'me',
            labelId: appConfig.gmail.labelsIds[0],
            historyTypes: ["messageAdded","labelAdded"]
        });
        console.timeEnd("getHistoryList");
        var history = res.data.history;
        if (history != null) {
            if (history.length > 0) {
                // First History
                var msgs = [];
                history.forEach(item => {
                    const labelsAdded = item.labelsAdded;
                    const messagesAdded = item.messagesAdded;
                    if(labelsAdded!=null)
                        for (let index = 0; index < labelsAdded.length; index++) {
                            if(labelsAdded[index].labelIds.some(r=> appConfig.gmail.labelsIds.indexOf(r) >= 0)) // Check if the label IDs we monitor is one of the labels being added
                                msgs.push({id: labelsAdded[index].message.id, threadId: labelsAdded[index].message.threadId});
                        }
                    
                    if(messagesAdded!=null)
                        for (let index = 0; index < messagesAdded.length; index++) {
                            msgs.push({id: messagesAdded[index].message.id, threadId: messagesAdded[index].message.threadId});
                        }
                });

                if(msgs.length>0)
                    msgs = msgs.reduce((newArr, current) => {
                        const x = newArr.find(item => item.id === current.id || item.threadId === current.threadId);
                        if (!x) {
                          return newArr.concat([current]);
                        } else {
                          return newArr;
                        }
                      }, []) // Remove duplicates based on if id or threadId matches with another element

                var pCount = 0;
                var msgIds = [];
                for (let index = 0; index < msgs.length; index++) {
                    const messageId = msgs[index].id;
                    console.time("getMessageData");
                    const msg = await gmail.getMessageData(messageId); // Fetch content for each unique message
                    console.timeEnd("getMessageData");
                    if (msg == null || msg == undefined) {
                        console.error("Message object was null: id: " + messageId);
                        continue;
                    }
                    pCount++;
                    msgIds.push(messageId);
                    console.time("processEmail");
                    await processEmail(msg, messageId);
                    console.timeEnd("processEmail");
                }
                console.log("Message count: " + msgs.length + " | Processed Messages: " + pCount);
                console.log("Messages ID: " + msgIds.join(","));

            }
        }
        await storage.saveFileContent(DEBUG_FOLDER + historyId + ".json", JSON.stringify(res.data));
        return res.data;
    }
    catch (ex) {
        throw new Error("fetchMessageFromHistory ERROR: " + ex);
    }
}

/**
 * Helper function to process the email data received from the Gmail API users.messages.get endpoint
 *
 * @param {Object} msg The message object that contains all the metadata of an email, like subject, snippet, body, to, form, etc.
 * @param {String} messageId The message ID of the message object being processed
 * @return {Null} Does not return anything, must use await if you want it to complete the processing but not mandatory to await
 * @see For detailed message object properties, visit {@link https://developers.google.com/gmail/api/reference/rest/v1/users.messages#Message}
 */
async function processEmail(msg, messageId) {
    try {

        const payload = msg.data.payload;
        const headers = payload.headers; // array of header objects containing subject and from values.
        const parts = payload.parts; // array of content (different types, plain, html, etc.)
        const emailType = payload.mimeType; // Either multipart or plain text is supported
        if (headers == null || headers == undefined) {
            console.debug("Header is not defined");
            return;
        }
        
        var email = {
            id: msg.data.id,
            from: "",
            to: "",
            subject: "",
            snippet: msg.data.snippet,
            bodyText: "",
            bodyHtml: ""
        };

        if(emailType.includes("plain")) {
            email.bodyText = payload.body.data;// Value is Base64 || Buffer.from(part.body.data, 'base64').toString('ascii');
        }
        else {
            if (parts == null || parts == undefined) {
                console.debug("Parts is not defined for msgId: " + messageId +  " mimeType: " + emailType);
                email.bodyText = payload.body.data;
            }
            else {
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
            }
        }


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

        
        storage.saveFileContent(DEBUG_FOLDER + messageId + "_msg.json", JSON.stringify(msg));
        storage.saveFileContent(EMAILS_FOLDER + messageId + "_email.json", JSON.stringify(email));

        var fromName = email.from.split("<")[0].trim();
        var notificationText = fromName + ": " + email.subject + "\n\n" + email.snippet;
        await sendNotification(notificationText);

        console.debug("Message notification sent!: " + email.from + " - " + messageId);
    }
    catch (ex) {
        throw new Error("process email error: " + ex);
    }
}

/**
 * Function to execute an external WebHook via a HTTP Post method, passing the text data provided.
 *
 * @param {String} text The text data that needs to be send via HTTP Post to the external url (WebHook)
 */
async function sendNotification(text) {
    const p = require('phin');
    await p({
        url: appConfig.external.webhookUrl,
        method: 'POST',
        headers: {
            "Content-type": "application/json"
        },
        data: { text: text }
    });
}