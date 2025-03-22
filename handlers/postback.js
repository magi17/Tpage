const { sendMessage } = require('./message');

function handlePostback(event, pageAccessToken) {
  const senderId = event.sender.id;
  const payload = event.postback.payload;

  // No handling logic here
}

module.exports = { handlePostback };
