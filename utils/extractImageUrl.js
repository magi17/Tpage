async function extractImageUrl(event, authToken) {
    try {
        if (event.message.reply_to?.mid) {
            return await getRepliedImage(event.message.reply_to.mid, authToken);
        } else if (event.message?.attachments?.[0]?.type === 'image') {
            return event.message.attachments[0].payload.url;
        }
    } catch (error) {
        console.error("Failed to extract image URL:", error);
    }
    return "";
}

async function getRepliedImage(messageId, authToken) {
    const axios = require('axios');
    try {
        const response = await axios.get(
            `https://graph.facebook.com/v13.0/${messageId}`,
            { params: { access_token: authToken, fields: 'attachments' } }
        );
        const attachment = response.data.attachments?.data[0];
        return attachment?.payload?.url || "";
    } catch (error) {
        console.error('Error fetching replied image:', error.response?.data || error.message);
        return "";
    }
}

module.exports = extractImageUrl;
