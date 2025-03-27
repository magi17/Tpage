const express = require('express');
const { GoogleGenerativeAI, HarmCategory, HarmBlockThreshold } = require('@google/generative-ai');
const axios = require('axios');
const bodyParser = require('body-parser');
const mime = require('mime-types');

const app = express();
app.use(bodyParser.json());

// Enhanced Gemini Configuration
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || 'AIzaSyC5n8Fr6Xq722k0jkrRM0emqSQk_4s_C-o');
const visionModel = genAI.getGenerativeModel({
  model: "gemini-1.5-pro", // Updated to latest vision-capable model
  generationConfig: {
    temperature: 0.9,
    topP: 0.95,
    topK: 64,
    maxOutputTokens: 8192,
  },
  safetySettings: [
    { category: HarmCategory.HARM_CATEGORY_HARASSMENT, threshold: HarmBlockThreshold.BLOCK_ONLY_HIGH },
    { category: HarmCategory.HARM_CATEGORY_HATE_SPEECH, threshold: HarmBlockThreshold.BLOCK_ONLY_HIGH },
    { category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT, threshold: HarmBlockThreshold.BLOCK_ONLY_HIGH },
    { category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT, threshold: HarmBlockThreshold.BLOCK_ONLY_HIGH },
  ],
  systemInstruction: {
    role: "model",
    parts: [{ 
      text: "You are a helpful AI assistant with vision capabilities. When analyzing images, be descriptive and provide detailed insights. For multiple images, compare and contrast them when relevant." 
    }]
  }
});

// Conversation history storage with vision support
const chatSessions = new Map();

// Facebook Configuration
const PAGE_ACCESS_TOKEN = process.env.FB_PAGE_TOKEN || '';
const VERIFY_TOKEN = process.env.FB_VERIFY_TOKEN || 'bobo';

// Supported image MIME types for Gemini Vision
const SUPPORTED_IMAGE_TYPES = [
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/heic',
  'image/heif'
];

// Webhook verification
app.get('/webhook', (req, res) => {
  if (req.query['hub.verify_token'] === VERIFY_TOKEN) {
    res.send(req.query['hub.challenge']);
  } else {
    res.sendStatus(403);
  }
});

// Enhanced message handling with vision support
app.post('/webhook', async (req, res) => {
  try {
    const messaging_events = req.body.entry?.[0]?.messaging || [];
    
    for (const event of messaging_events) {
      if (event.message) {
        const senderId = event.sender.id;
        
        // Get or create chat session with vision capabilities
        if (!chatSessions.has(senderId)) {
          chatSessions.set(senderId, {
            chat: visionModel.startChat({
              history: [{
                role: "model",
                parts: [{ 
                  text: "Hello! I'm an AI assistant with vision capabilities. You can send me images and I'll analyze them for you." 
                }]
              }]
            }),
            lastActivity: Date.now()
          });
        }
        
        const session = chatSessions.get(senderId);
        session.lastActivity = Date.now();
        
        const { text } = event.message;
        const attachments = event.message.attachments || [];
        
        // Prepare message parts for Gemini (text + images)
        const messageParts = [];
        
        if (text) {
          messageParts.push({ text });
        }
        
        // Process attachments with vision support
        if (attachments.length > 0) {
          const imageParts = await processAttachments(attachments);
          messageParts.push(...imageParts);
        }
        
        if (messageParts.length > 0) {
          try {
            // Get AI response with vision capabilities
            const result = await session.chat.sendMessage(messageParts);
            const aiResponse = result.response.text();
            
            // Send response back to user
            await sendFacebookMessage(senderId, aiResponse);
            
            // Log token usage
            console.log(`Tokens used for ${senderId}:`, result.response.usageMetadata?.totalTokenCount || 'unknown');
          } catch (error) {
            console.error('Gemini API Error:', error);
            await sendFacebookMessage(senderId, "I encountered an error processing your request. Please try again.");
          }
        }
      }
    }
    
    res.sendStatus(200);
  } catch (error) {
    console.error('Error in webhook:', error);
    res.sendStatus(500);
  }
});

// Process attachments with enhanced vision support
async function processAttachments(attachments) {
  const parts = [];
  
  for (const attachment of attachments) {
    try {
      if (attachment.type === 'image' || attachment.type === 'file') {
        const url = attachment.payload.url;
        const contentType = attachment.payload.mimeType || 
                          mime.lookup(url) || 
                          'application/octet-stream';
        
        // Only process supported image types
        if (SUPPORTED_IMAGE_TYPES.includes(contentType)) {
          const imageData = await downloadAndProcessImage(url, contentType);
          if (imageData) {
            parts.push({
              inlineData: {
                data: imageData.data,
                mimeType: imageData.mimeType
              }
            });
          } else {
            parts.push({ text: `[Could not process image from ${url}]` });
          }
        } else {
          parts.push({ text: `[Received unsupported file type: ${contentType}]` });
        }
      }
    } catch (error) {
      console.error('Error processing attachment:', error);
      parts.push({ text: '[Error processing attachment]' });
    }
  }
  
  return parts;
}

// Enhanced image download and processing
async function downloadAndProcessImage(url, mimeType) {
  try {
    const response = await axios.get(url, {
      responseType: 'arraybuffer',
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/114.0.0.0 Safari/537.36',
        'Referer': 'https://facebook.com'
      },
      timeout: 10000, // 10 second timeout
      maxContentLength: 10 * 1024 * 1024 // 10MB max size
    });
    
    return {
      data: Buffer.from(response.data).toString('base64'),
      mimeType: mimeType || response.headers['content-type'] || 'image/jpeg'
    };
  } catch (error) {
    console.error('Error downloading image:', error);
    return null;
  }
}

// Send message through Facebook API with enhanced error handling
async function sendFacebookMessage(recipientId, messageText) {
  try {
    await axios.post(`https://graph.facebook.com/v19.0/me/messages`, {
      recipient: { id: recipientId },
      message: { text: messageText }
    }, {
      params: { access_token: PAGE_ACCESS_TOKEN },
      timeout: 5000
    });
  } catch (error) {
    console.error('Facebook API Error:', error.response?.data || error.message);
    
    // Handle token expiration specifically
    if (error.response?.data?.error?.code === 190) {
      console.error('Access token expired or invalid');
      // Here you could implement token refresh logic if needed
    }
  }
}

// Session cleanup with enhanced logic
setInterval(() => {
  const now = Date.now();
  const oneHourAgo = now - 3600000;
  
  for (const [senderId, session] of chatSessions.entries()) {
    if (session.lastActivity < oneHourAgo) {
      chatSessions.delete(senderId);
      console.log(`Cleaned up session for user ${senderId}`);
    }
  }
}, 3600000); // Every hour

// Start server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Vision-enabled bot server running on port ${PORT}`);
  console.log(`Webhook URL: https://yourdomain.com/webhook`);
});
