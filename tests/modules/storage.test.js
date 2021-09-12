const appConfig = require("../../config/appconfig.json");
const storage = require("../../modules/storage");

const testObject = { test: "Hello World" };
const testFilePath = appConfig.gcp.storage.debugFolderName + "test.json";

describe("Testing Storage Functionality", () => {

    test("Save, check exists and fetch test file in debug folder", async () => {
        return storage.saveFileContent(testFilePath, JSON.stringify(testObject)).then((isSaved) => {
            expect(isSaved).toBe(true);
            return storage.fileExist(testFilePath).then((isExist) => {
                expect(isExist).toBe(true);
                return storage.fetchFileContent(testFilePath).then((data) => {
                    expect(JSON.parse(data[0])).toEqual(testObject);
                }).catch((err) => {
                    throw new Error("Error fetching file content: " + err);
                });
            }).catch((err) => {
                throw new Error("Error checking if file exist: " + err);
            });
        }).catch((err) => {
            throw new Error("Error saving file content: " + err);
        });
    });

    test("Delete test file in debug folder", async () => {
        return storage.deleteFile(testFilePath).then((isDeleted) => {
            expect(isDeleted).toBe(true);
        }).catch((err) => {
            throw new Error("Error deleting file content: " + err);
        });
    });

});