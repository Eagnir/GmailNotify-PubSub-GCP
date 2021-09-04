exports.appConfig = {
    slack:{
        webhookUrl: ''
    },
    gcp:{
        pubsub:{
            topic: '',
        },
        storage: {
            bucketName: '',
            rootFolderName: '',
            historyFilename: ''
        },
        auth:{
            googleKeyFilePath: '',
            subject: ''
        },
    },
    gmail: {
        scopes: [],
        labelsIds: []
    }

};