const appConfig = require("../../config/appconfig.json");
const storage = require("../storage");
const gmail = require("../gmail");

const ROOT_FOLDER = appConfig.gcp.storage.rootFolderName;
const HISTORY_FILE_PATH = ROOT_FOLDER + appConfig.gcp.storage.historyFilename;
const EMAILS_FOLDER = ROOT_FOLDER + appConfig.gcp.storage.emailsFolderName;
const DEBUG_FOLDER = ROOT_FOLDER + appConfig.gcp.storage.debugFolderName;

var GMAIL = null;

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

async function moveForward(prevHistoryId, msgObj) {
    GMAIL = await gmail.getAuthenticatedGmail();
    storage.saveFileContent(HISTORY_FILE_PATH, JSON.stringify(msgObj));
    await fetchMessageFromHistory(prevHistoryId);
}

async function fetchMessageFromHistory(historyId) {
    try {
        const res = await gmail.getHistoryList({
            startHistoryId: historyId,
            userId: 'me',
            labelId: appConfig.gmail.labelsIds[0],
            historyTypes: ["messageAdded","labelAdded"]
        });
        var history = res.data.history;
        if (history != null) {
            if (history.length > 0) {
                // First History
                var msgs = [];
                history.forEach(item => {
                    const labelsAdded = item.labelsAdded;
                    const messagesAdded = item.messagesAdded;
                    if(labelsAdded!=null)
                        for (let index = 0; index < labelsAdded.length; index++) { msgs.push({id: labelsAdded[index].message.id, threadId: labelsAdded[index].message.threadId}); }
                    
                    if(messagesAdded!=null)
                        for (let index = 0; index < messagesAdded.length; index++) { msgs.push({id: messagesAdded[index].message.id, threadId: messagesAdded[index].message.threadId}); }
                });

                if(msgs.length>0)
                    msgs = msgs.reduce((newArr, current) => {
                        const x = newArr.find(item => item.id === current.id || item.threadId === current.threadId);
                        if (!x) {
                          return newArr.concat([current]);
                        } else {
                          return newArr;
                        }
                      }, []) // Remove duplicates based on if id or threadId matches

                var pCount = 0;
                var msgIds = [];
                for (let index = 0; index < msgs.length; index++) {
                    const messageId = msgs[index].id;
                    const msg = await gmail.getMessageData(messageId); // Fetch content for each unique message
                    if (msg == null || msg == undefined) {
                        console.error("Message object was null: id: " + messageId);
                        continue;
                    }
                    pCount++;
                    msgIds.push(messageId);
                    await processEmail(msg, messageId);
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
        await storage.saveFileContent(EMAILS_FOLDER + messageId + "_email.json", JSON.stringify(email));

        var fromName = email.from.split("<")[0].trim();
        var notificationText = fromName + ": " + email.subject + "\n\n" + email.snippet;
        await sendNotification(notificationText);

        console.debug("Message notification sent!: " + email.from);
    }
    catch (ex) {
        throw new Error("process email error: " + ex);
    }
}

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