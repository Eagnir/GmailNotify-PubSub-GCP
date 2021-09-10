const appConfig = require("../config/appconfig.json");

const {Storage} = require('@google-cloud/storage');
const gcStorage = new Storage({keyFilename: appConfig.gcp.auth.googleKeyFilePath});

const bucketName = appConfig.gcp.storage.bucketName;

exports.saveFileContent = (filePath, content) => {
    return gcStorage.bucket(bucketName).file(filePath).save(content).then(()=>{
        return true;
    });
}

exports.fileExist = (filePath) => {
    return gcStorage.bucket(bucketName).file(filePath).exists().then(()=>{
        return true;
    });
}

exports.fetchFileContent = (filePath) => {
    return gcStorage.bucket(bucketName).file(filePath).download();
}

exports.deleteFile = (filePath) => {
    return gcStorage.bucket(bucketName).file(filePath).delete().then(()=>{
        return true;
    });
}
  