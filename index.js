const {appConfig} = require("./config/appconfig");
const {google} = require('googleapis');

const GoogleKeyFile = appConfig.gcp.auth.googleKeyFilePath;
const AuthJWTSubject = appConfig.gcp.auth.subject;

const HISTORY_PATH = appConfig.gcp.storage.historyFilename;
const SCOPES = appConfig.gmail.scopes;
const LABELIDS = appConfig.gmail.labelsIds;

const PubSubTopic = appConfig.gcp.pubsub.topic;

const bucketName = appConfig.gcp.storage.bucketName;
const folderName = appConfig.gcp.storage.rootFolderName;

const {Storage} = require('@google-cloud/storage');
const gcStorage = new Storage({keyFilename: GoogleKeyFile});

const JWT = google.auth.JWT;
const authClient = new JWT({
  keyFile: GoogleKeyFile,
  scopes: SCOPES,
  subject: AuthJWTSubject
});

var GMAIL = null;

exports.ProcessMessage = async (event, context) => {
  const message = event.data
    ? Buffer.from(event.data, 'base64').toString()
    : 'No data provided';
  const msgObj = JSON.parse(message);

  gcStorage.bucket(bucketName).file(folderName + HISTORY_PATH).exists().then(function(data) {
    const exists = data[0];
    if(exists) {
        getFileContent(HISTORY_PATH).then((data) => {
          const prevMsgObj = JSON.parse(data[0]);
          moveForward(prevMsgObj.historyId, msgObj);
        });
    }
    else {
      console.debug("History File Did not Exist");
      storeFileContent(HISTORY_PATH, JSON.stringify(msgObj));
    }
  });
  console.debug("All Code Executed");
};

async function moveForward(prevHistoryId, msgObj) {
  GMAIL = await getAuthGmail();
  storeFileContent(HISTORY_PATH, JSON.stringify(msgObj));
  fetchMessageFromHistory(prevHistoryId);
}

async function fetchMessageFromHistory(historyId) {
  try {
    const res = await GMAIL.users.history.list({
      startHistoryId: historyId,
      userId: 'me',
      labelId: LABELIDS[0],
      historyTypes: ["messageAdded"]
    });
    var history = res.data.history;
    if(history!=null) {
      if(history.length>0) {
        // First History
        var msgs = [];
        const messages = history[0].messages;
        for (let index = 0; index < messages.length; index++) { msgs.push(messages[index].id); }
        msgs = msgs.filter((x, i) => i === msgs.indexOf(x)); // Remove duplicates
        for (let index = 0; index < msgs.length; index++) {
          const messageId = msgs[index];
          const msg = await getMessageDetails(messageId); // Fetch content for each unique message
          if (msg == null || msg == undefined) {
            console.error("Message object was null: id: " + messageId);
            continue;
          }
          processEmail(msg, messageId);
        }

      }
    }
    storeFileContent(historyId + ".json",JSON.stringify(res.data));
    return res.data;
  }
  catch(ex){
    console.error("ERROR: " + ex);
  }
}

function processEmail(msg, messageId) {
  try {

    const payload = msg.data.payload;
    const headers = payload.headers; // array of header objects containing subject and from values.
    const parts = payload.parts; // array of content (different types, plain, html, etc.)
    if(headers == null || headers == undefined) {
      console.debug("Header is not defined");
      return;
    }
    if(parts == null || parts == undefined) {
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
      switch(name)
      {
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
      switch(mimeType)
      {
        case "text/plain":
          email.bodyText = part.body.data;// Value is Base64 || Buffer.from(part.body.data, 'base64').toString('ascii');
          break;
        case "text/html":
          email.bodyHtml = part.body.data;// Value is Base64 || Buffer.from(part.body.data, 'base64').toString('ascii');
          break;
      }
    });
    storeFileContent(messageId + "_msg.json",JSON.stringify(msg));
    storeFileContent(messageId + "_email.json",JSON.stringify(email));

    var fromName = email.from.split("<")[0].trim();
    var notificationText = fromName + ": " + email.subject + "\n\n" + email.snippet;
    
    const p = require('phin');
    p({
        url: appConfig.slack.webhookUrl,
        method: 'POST',
        headers:{
          "Content-type": "application/json"
        },
        data: { text: notificationText}
    });
    console.debug("Message notification sent!: " + email.from);
  }
  catch(ex) {
    console.error("process email error: " + ex);
  }
}

async function getMessageDetails(messageId) {
  try {
    const resp = await GMAIL.users.messages.get({
      userId: 'me',
      id: messageId
    });
    return resp;
  }
  catch(ex) {
    console.error("msg details error: " + ex);
    return null;
  }
}

async function storeFileContent(filePath, content) {
  
  return gcStorage.bucket(bucketName).file(folderName + filePath).save(content, (err) => {
    if (!err) {
      console.debug("File written successfully - " + filePath);
      return true;
    }
    else {
      console.debug("File error : " + err);
      return false;
    }
  });

}

exports.storeFileContent = storeFileContent;

function getFileContent(filePath) {
  return gcStorage.bucket(bucketName).file(folderName + filePath).download();
}

exports.getFileContent = getFileContent;

exports.stopWatch = async (req, res) => {
  try {
    const gmail = await getAuthGmail();
    const resp = await gmail.users.stop({
      userId: 'me',
    });
    res.status(200).send("Successfully Stop Watching - " + JSON.stringify(resp));
  }
  catch(ex) {
    res.status(500).send("Error occured: " + ex);
  }
};

exports.startWatch = async (req, res) => {
  try {
    const gmail = await getAuthGmail();
    const resp = await gmail.users.watch({
      'userId': 'me',
      topicName: PubSubTopic,
      labelIds: LABELIDS,
      labelFilterAction: "include"
    });
    res.status(200).send("Successfully Started Watching - " + JSON.stringify(resp));
  }
  catch(ex) {
    res.status(500).send("Error occured: " + ex);
  }
};

async function getAuthGmail() {
  try {
    await authClient.authorize();

    const gmail = google.gmail({
      auth: authClient,
      version: 'v1'
    });

    return gmail;
  }
  catch(ex) {
    return null;
  }
}