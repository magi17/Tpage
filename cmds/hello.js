const sendText = require('../utils/sendText');

module.exports = {
    name: 'hello',
    description: 'Replies with a greeting message.',
    execute: async (event, pageAccessToken) => {
        const senderId = event.sender.id;
        await sendText(senderId, 'Hello! How can I assist you today?', pageAccessToken);
    }
};
