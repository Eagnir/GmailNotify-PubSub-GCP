const appConfig = require("../../config/appconfig.json");
const gmail = require("../../modules/gmail");

describe("Testing Gmail API Functionality", () => {

    test("Fetch history list", async () => {
        const resp = await gmail.getHistoryList({
            startHistoryId: "12342956",
            userId: 'me',
            labelId: appConfig.gmail.labelsIds[0],
            historyTypes: ["messageAdded"]
        });
        expect(resp.status).toBe(200);
        expect(resp.data).toMatchObject(expect.objectContaining({
            history: expect.any(Array),
            historyId: expect.any(String)
        }))
    });

    test("Fetch message data", async () => {
        const messageId = "17ba8c0a7d532392";
        const resp = await gmail.getMessageData(messageId);
        expect(resp.status).toBe(200);
        expect(resp.data).toMatchObject(expect.objectContaining({
            id: messageId,
            threadId: expect.any(String),
            labelIds: expect.any(Array),
            snippet: expect.any(String),
            payload: {
                headers: expect.any(Array),
                parts: expect.any(Array),

                body: expect.any(Object),
                filename: expect.any(String),
                mimeType: expect.any(String),
                partId: expect.any(String)
            },
            sizeEstimate: expect.any(Number),
            internalDate: expect.any(String),
            historyId: expect.any(String)
        }))
    });

});