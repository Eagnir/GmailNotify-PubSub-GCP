# Project for Push Notifications to Webhooks

## Introduction
**GmailNotify** This is a quick project made to consume Pub-Sub messages sent via Gmail to be processed and finally execute a Webhook for external services to receive a push of email data.

It is in essense a set of NodeJS Cloud Functions to handle Gmail Notifications which can be configured to receive wide range of Gmail notifications based on the `config/appconfig.json` file setting.

## Technologies Used
* NodeJS v14
* google-cloud/pubsub v0.18.0
* google-cloud/storage v5.14.0
* googleapis v85.0.0
* phin v3.6.0

## Google Cloud Resources Used
* Cloud Functions
* Cloud Storage
* Pub/Sub

> These are just the primary resources, other supporting resources are also used but mainly for networking, security and permissions.

## Code Structure
The code is structured for clean and simple implementation as well as maintenance.

### Primary Folder's Explanation
* `/config` - contains the `appconfig.json` file (renamed from `sample-appconfig.json` template file) after putting in the values.
* `/credentials` - contains the `google-key.json` file (renamed from `sample-google-key.json` template file) after replacing the content from the actual json key file download from Google Cloud Platform.
* `/modules` - contains the individual modules `*.js` files.
* `/modules/functions` - contains the core Cloud Functions in their respective `*.js` files.
* `/tests` - contains all the JEST test files used to perform checks and validation on the functionality of the application locally, before deploying the Cloud Functions.

## Compiling
There are scripts already part of the `package.json` file to publish the project into the `/publish` directory and zip the output with the project name and version (from `package.json.version` property) for quick upload and deployment of Cloud Functions.

**Publish Command**
```
npm run publish
```
> Don't forget to rename the `sample-*.json` files in `/config` and `/credentials` folder as required (see below section **Basic Application Configuration**).

Publish outputs to a zip file
```
/publish/GNFunc_v{version}.zip
```

**Run all tests**
```
npm run test
```

## Google Cloud Setup
### Create a Cloud Storage
### Create Cloud Functions
## Functional Flow
The Cloud Function is deployed so that it starts the code in the `/main.js` file (which is renamed to `/index.js` on publish) and executes the assigned Cloud Function Entry Point.
## Google Cloud Credentials
To get the Google Cloud Credentials, you need to complete the following steps on your Google Cloud Platform account.

## Basic Application Configuration
You must have the Google Cloud Credentials `.json` file as well as have created the Cloud Storage, before you configure the application.

### Rules
While entering values for the application config, please keep in mind the following.

1. `gcp.storage.*` - any folder name property (like `gcp.storage.rootFolderName` or `gcp.storage.debugFolderName`, etc.) must end with a `/` (forward slash) if a value is provided.
2. `gcp.storage.historyFilename` - property must have a filename ending with `.json` file extension.
3. `gcp.auth.googleKeyFilePath` - property must have a file path ending with a filename that has the `.json` file extension.
4. `gcp.auth.subject` - property must be your full valid email address of the Gmail account you want to recevie the push notification from.
5. `gmail` - property object is based on the **Gmail API** and more information on the appropriate values for this properties can be found in the [Gmail API Reference](https://developers.google.com/gmail/api/reference/rest).

### Minimum Configuration
For you to quickly deploy this application, you only need to provide the following configuration

**For `/config/sample-appconfig.json` file.**

1. `external.webhookUrl` - a full qualified URL to an external service that accepts an `Post` request with the body
    ```
    { text: 'email_text_here' }
    ```
2. `gcp.pubsub.topic` - the full topic name as provided in the Cloud Pub/Sub Dashboard.
3. `gcp.storage.bucketName` - the full bucket name as provided in the Cloud Storage Dashboard.
4. `gcp.auth.subject` - the full gmail email address you are to recevie the Pub/Sub notifications from.

**For `/credentials/sample-google-key.json` file.**
1. Simply replace the content of this sample file with the content from your download `.json` cloud key file.

### Rename Config & Credentials Files

* Rename the `sample-google-key.json` file to `google-key.json` file.

* Rename the `sample-appconfig.json` file to `appconfig.json` file.