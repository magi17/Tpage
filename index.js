require('dotenv').config();
const express = require('express');
const bodyParser = require('body-parser');
const axios = require('axios');
const fs = require('fs');
const app = express();

app.use(bodyParser.json());

// Load commands dynamically with logs
const cmds = new Map();
fs.readdirSync('./cmds').forEach(file => {
    if (file.endsWith('.js')) {
        const cmd = require(`./cmds/${file}`);
        cmds.set(cmd.name, cmd);
        console.log(`[COMMAND LOADED] ${cmd.name}`);
    }
});

// Verify webhook
app.get('/webhook', (req, res) => {
    if (req.query['hub.verify_token'] === process.env.VERIFY_TOKEN) {
        console.log('[WEBHOOK VERIFIED]');
        res.send(req.query['hub.challenge']);
    } else {
        res.sendStatus(403);
    }
});

// Handle webhook events (messages)
app.post('/webhook', async (req, res) => {
    const body = req.body;

    if (body.object === 'page') {
        for (const entry of body.entry) {
            const event = entry.messaging[0];
            const senderId = event.sender.id;

            if (event.message && event.message.text) {
                const msg = event.message.text.trim();
                console.log(`[MESSAGE RECEIVED] From: ${senderId} | Message: "${msg}"`);
                
                const args = msg.split(' ');
                const commandName = args[0].toLowerCase();

                if (cmds.has(commandName)) {
                    console.log(`[COMMAND DETECTED] Executing "${commandName}" for user ${senderId}`);
                    try {
                        await cmds.get(commandName).run(senderId, args.slice(1), event);
                    } catch (err) {
                        console.error(`[ERROR] While executing "${commandName}":`, err);
                        await sendText(senderId, 'An error occurred while processing your command.');
                    }
                } else {
                    console.log(`[UNKNOWN COMMAND] "${commandName}" from user ${senderId}`);
                    await sendText(senderId, `Unknown command: ${commandName}. Type "help" for commands.`);
                }
            }
        }
        res.sendStatus(200);
    } else {
        res.sendStatus(404);
    }
});

// Function to send a text message
async function sendText(recipientId, text) {
    await axios.post(`https://graph.facebook.com/v13.0/me/messages?access_token=${process.env.PAGE_ACCESS_TOKEN}`, {
        recipient: { id: recipientId },
        message: { text }
    }).catch(err => console.error('[ERROR] Sending message:', err.response ? err.response.data : err));
}

// Export sendText so it can be used inside command files
module.exports = { sendText };

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`========================================`);
    console.log(` Facebook Page Bot started successfully!`);
    console.log(` Listening on port ${PORT}`);
    console.log(` Loaded ${cmds.size} command(s).`);
    console.log(`========================================`);
});
