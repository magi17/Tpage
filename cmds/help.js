const sendText = require('../utils/sendText');

module.exports = {
    name: 'help',
    description: 'Lists available commands.',
    execute: async (event, pageAccessToken) => {
        const senderId = event.sender.id;
        await sendText(senderId, 'Available commands:\n- hello\n- help\n- extract (reply to an image message and type "extract")', pageAccessToken);
    }
};
