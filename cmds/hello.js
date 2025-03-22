const { sendText } = require('../index');

module.exports = {
    name: 'hello',
    run: async (senderId, args) => {
        await sendText(senderId, `Hello! Kupal How can I help you today?`);
    }
};
