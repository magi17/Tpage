const fs = require('fs');
const path = require('path');

async function handleMessage(event, pageAccessToken) {
    const messageText = event.message.text.trim().toLowerCase();
    const commandFiles = fs.readdirSync(path.join(__dirname, '../cmds')).filter(file => file.endsWith('.js'));

    for (const file of commandFiles) {
        const command = require(`../cmds/${file}`);
        if (messageText.startsWith(command.name)) {
            console.log(`[COMMAND DETECTED] Executing "${command.name}"`);
            await command.execute(event, pageAccessToken);
            return;
        }
    }
    console.log('[UNKNOWN COMMAND]');
}

module.exports = handleMessage;
