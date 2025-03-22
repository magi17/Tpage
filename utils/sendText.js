const axios = require('axios');

async function sendText(senderId, message, pageAccessToken) {
    if (!senderId || !message) {
        console.error('Missing senderId or message.');
        return;
    }

    try {
        await axios.post(`https://graph.facebook.com/v13.0/me/messages`, {
            recipient: { id: senderId },
            message: { text: message }
        }, {
            params: { access_token: pageAccessToken }
        });
        console.log('Message sent successfully to:', senderId);
    } catch (error) {
        console.error('Error sending message:', error.response?.data || error.message);
    }
}

module.exports = sendText;
