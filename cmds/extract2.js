const sendText = require('../utils/sendText');
const extractImageUrl = require('../utils/extractImageUrl');

module.exports = {
    name: 'extract2',
    description: 'Extracts the image URL from a replied image or message attachment.',
    execute: async (event, pageAccessToken) => {
        const senderId = event.sender.id;
        const imageUrl = await extractImageUrl(event, pageAccessToken);

        if (imageUrl) {
            await sendText(senderId, `Image URL extracted:\n${imageUrl}`, pageAccessToken);
        } else {
            await sendText(senderId, 'No image found in the message or reply.', pageAccessToken);
        }
    }
};
