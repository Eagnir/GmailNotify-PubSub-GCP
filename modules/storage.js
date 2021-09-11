const appConfig = require("../config/appconfig.json");

const {Storage} = require('@google-cloud/storage');
const gcStorage = new Storage({keyFilename: appConfig.gcp.auth.googleKeyFilePath});

const bucketName = appConfig.gcp.storage.bucketName;

exports.saveFileContent = (filePath, content) => {
    const defOptions = {
        resumable: false,
        validation: false
    };
    return gcStorage.bucket(bucketName).file(filePath).save(content, defOptions).then(()=>{
        return true;
    });
}

exports.fileExist = (filePath) => {
    return gcStorage.bucket(bucketName).file(filePath).exists().then((doesExist)=>{
        return doesExist[0];
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
  