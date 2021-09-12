const appConfig = require("../config/appconfig.json");

const {Storage} = require('@google-cloud/storage');
const gcStorage = new Storage({keyFilename: appConfig.gcp.auth.googleKeyFilePath});

const bucketName = appConfig.gcp.storage.bucketName;

/**
 * Helper function to save some data (content) to a file at the given path, currently configured for Google Cloud Storage
 *
 * @param {String} filePath Location + filename with extension to save the content in
 * @param {String} content Any content that needs to be saved to the File System
 * @return {Promise} A Promise that resolves when the file is successfully saved (returns true on resolve), any error must be caught by `.catch` function 
 * @see {@link https://googleapis.dev/nodejs/storage/latest/File.html#save}
 */
exports.saveFileContent = (filePath, content) => {
    const defOptions = {
        resumable: false,
        validation: false
    };
    return gcStorage.bucket(bucketName).file(filePath).save(content, defOptions).then(()=>{
        return true;
    });
}

/**
 * Helper function to check if a file exist at the given path, currently configured for Google Cloud Storage
 *
 * @param {String} filePath Location + filename with extension to check
 * @return {Promise} A Promise that resolves when the file is either found or not found, returns true if found else false when resolved. Any error must be caught by `.catch` function
 * @see {@link https://googleapis.dev/nodejs/storage/latest/File.html#exists}
 */
exports.fileExist = (filePath) => {
    return gcStorage.bucket(bucketName).file(filePath).exists().then((doesExist)=>{
        return doesExist[0];
    });
}

/**
 * Helper function to get the content of a file, currenty configured for Google Cloud Storage
 *
 * @param {String} filePath Location + filename with extension to fetch the content from
 * @return {Promise} A Promise that resolves with the content (data) of the given file, returns an array of data as per the GCP Storage API, linked below.
 * @see {@link https://googleapis.dev/nodejs/storage/latest/File.html#download}
 */
exports.fetchFileContent = (filePath) => {
    return gcStorage.bucket(bucketName).file(filePath).download();
}

/**
 * Helper function to delete a file, currently configured for Google Cloud Storage
 *
 * @param {String} filePath Location + filename with extension of a file to delete
 * @return {Promise} A Promise that resolves when the file is deleted, returns true if resolved (file is deleted). Any error must be caught by `.catch` function
 * @see {@link https://googleapis.dev/nodejs/storage/latest/File.html#delete}
 */
exports.deleteFile = (filePath) => {
    return gcStorage.bucket(bucketName).file(filePath).delete().then(()=>{
        return true;
    });
}
  