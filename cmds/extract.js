const sendText = require('../utils/sendText');
const extractImageUrl = require('../utils/extractImageUrl');

module.exports = {
    name: 'extract',
    description: 'Extract image URL from an attachment or reply',
    execute: async (event, pageAccessToken) => {
        const senderId = event.sender.id;
        const imageUrl = await extractImageUrl(event, pageAccessToken);

        if (imageUrl) {
            await sendText(senderId, `Image URL: ${imageUrl}`, pageAccessToken);
        } else {
            await sendText(senderId, 'No image URL found in the message or reply.', pageAccessToken);
        }
    }
};
