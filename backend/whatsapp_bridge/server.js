const http = require('http');
const url = require('url');
const fs = require('fs');
const path = require('path');
const QRCode = require('qrcode');
const {
    default: makeWASocket,
    DisconnectReason,
    useMultiFileAuthState,
    fetchLatestBaileysVersion,
    downloadMediaMessage
} = require('@whiskeysockets/baileys');
const pino = require('pino');

const PORT = process.env.WHATSAPP_BRIDGE_PORT || 8001;
const AUTH_DIR = process.env.WHATSAPP_SESSION_DIR || path.join(__dirname, 'session_auth');

if (!fs.existsSync(AUTH_DIR)) {
    fs.mkdirSync(AUTH_DIR, { recursive: true });
}

let sock = null;
let currentQR = null;
let currentRawQR = null;
let currentPairingCode = null;
let connectionState = 'DISCONNECTED'; // DISCONNECTED, QR_READY, PAIRING_CODE_READY, CONNECTING, CONNECTED
let connectedUser = null;
let lastError = null;
let unreadMessagesStore = []; // In-memory store of incoming unread WhatsApp messages

const logger = pino({ level: 'silent' });

function forwardToFastAPI(msgRecord) {
    try {
        const postData = JSON.stringify(msgRecord);
        const options = {
            hostname: '127.0.0.1',
            port: 8000,
            path: '/api/v1/compliance/whatsapp/incoming-webhook',
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Content-Length': Buffer.byteLength(postData)
            },
            timeout: 2000
        };
        const req = http.request(options, (res) => {});
        req.on('error', () => {});
        req.write(postData);
        req.end();
    } catch (e) {}
}

async function initBaileysSocket(forceNew = false) {
    try {
        if (forceNew && fs.existsSync(AUTH_DIR)) {
            try {
                fs.rmSync(AUTH_DIR, { recursive: true, force: true });
                fs.mkdirSync(AUTH_DIR, { recursive: true });
            } catch (err) {
                console.error('[Baileys] Failed to clear auth dir:', err);
            }
        }

        currentQR = null;
        currentRawQR = null;
        currentPairingCode = null;
        lastError = null;

        const { state, saveCreds } = await useMultiFileAuthState(AUTH_DIR);
        const { version } = await fetchLatestBaileysVersion().catch(() => ({ version: [2, 3000, 1015901307] }));

        sock = makeWASocket({
            version,
            logger,
            printQRInTerminal: false,
            auth: state,
            browser: ['SmartFin.AI Office', 'Chrome', '1.0.0'],
            syncFullHistory: false,
            connectTimeoutMs: 60000,
            defaultQueryTimeoutMs: 60000
        });

        sock.ev.on('creds.update', saveCreds);

        sock.ev.on('connection.update', async (update) => {
            const { connection, lastDisconnect, qr } = update;

            if (qr) {
                try {
                    currentRawQR = qr;
                    currentQR = await QRCode.toDataURL(qr, { margin: 2, scale: 7 });
                    connectionState = 'QR_READY';
                    console.log('[Baileys] New QR Code generated successfully.');
                } catch (qrErr) {
                    console.error('[Baileys] Error rendering QR image:', qrErr);
                }
            }

            if (connection === 'connecting') {
                if (connectionState !== 'QR_READY' && connectionState !== 'PAIRING_CODE_READY') {
                    connectionState = 'CONNECTING';
                }
                console.log('[Baileys] Socket connecting to WhatsApp Web...');
            }

            if (connection === 'open') {
                connectionState = 'CONNECTED';
                currentQR = null;
                currentRawQR = null;
                currentPairingCode = null;
                lastError = null;
                if (sock.user) {
                    const phoneNumber = sock.user.id ? sock.user.id.split(':')[0].split('@')[0] : 'Office WhatsApp';
                    connectedUser = {
                        jid: sock.user.id,
                        phone: `+${phoneNumber}`,
                        name: sock.user.name || 'Office WhatsApp Device'
                    };
                    console.log(`[Baileys] Successfully connected as ${connectedUser.phone} (${connectedUser.name})`);
                }
            }

            if (connection === 'close') {
                const statusCode = lastDisconnect?.error?.output?.statusCode;
                const shouldReconnect = statusCode !== DisconnectReason.loggedOut;
                console.log(`[Baileys] Socket closed. Code: ${statusCode}, shouldReconnect: ${shouldReconnect}`);

                if (statusCode === DisconnectReason.loggedOut) {
                    connectionState = 'DISCONNECTED';
                    connectedUser = null;
                    currentQR = null;
                    currentPairingCode = null;
                    lastError = 'Session was unlinked or logged out. Please link again.';
                    try {
                        fs.rmSync(AUTH_DIR, { recursive: true, force: true });
                    } catch {}
                } else if (shouldReconnect) {
                    connectionState = 'CONNECTING';
                    setTimeout(() => initBaileysSocket(false), 3000);
                } else {
                    connectionState = 'DISCONNECTED';
                    connectedUser = null;
                }
            }
        });

        // 3. Listen to incoming messages throughout the day
        sock.ev.on('messages.upsert', async ({ messages, type }) => {
            try {
                for (const msg of messages) {
                    if (!msg.message) continue;
                    if (msg.key.fromMe) continue; // Skip messages sent by ourselves

                    const remoteJid = msg.key.remoteJid;
                    if (!remoteJid || remoteJid === 'status@broadcast') continue;

                    const text = msg.message?.conversation
                        || msg.message?.extendedTextMessage?.text
                        || msg.message?.imageMessage?.caption
                        || msg.message?.videoMessage?.caption
                        || msg.message?.documentMessage?.caption
                        || (msg.message?.buttonsResponseMessage?.selectedDisplayText)
                        || (msg.message?.templateButtonReplyMessage?.selectedDisplayText)
                        || (msg.message?.imageMessage ? '[Photo / Image Attachment]' : null)
                        || (msg.message?.documentMessage ? `[Document: ${msg.message.documentMessage.fileName || 'PDF/Doc'}]` : null)
                        || (msg.message?.audioMessage ? '[Voice Note]' : null)
                        || '';

                    if (!text.trim()) continue;

                    const isGroup = remoteJid.endsWith('@g.us');
                    const senderJid = msg.key.participant || remoteJid;
                    const senderName = msg.pushName || (isGroup ? 'Group Member' : remoteJid.split('@')[0]);
                    const timestampSeconds = msg.messageTimestamp ? Number(msg.messageTimestamp) : Math.floor(Date.now() / 1000);
                    const msgId = msg.key.id || `wa_${Date.now()}_${Math.random().toString(36).substring(7)}`;

                    // Auto-save incoming document/media attachments directly to ~/Desktop/<ClientName>/TDS_GST_Reports/
                    let savedFilePath = null;
                    let hasAttachment = false;
                    if (msg.message?.documentMessage || msg.message?.imageMessage) {
                        try {
                            hasAttachment = true;
                            const desktopDir = process.env.DESKTOP_DIR || path.join(process.env.HOME || '', 'Desktop');
                            const cleanClientName = senderName.replace(/[^a-zA-Z0-9_-]/g, '_');
                            const targetDir = path.join(desktopDir, cleanClientName, 'TDS_GST_Reports');
                            fs.mkdirSync(targetDir, { recursive: true });

                            const rawFileName = msg.message?.documentMessage?.fileName || `report_${Date.now()}.${msg.message?.imageMessage ? 'jpg' : 'pdf'}`;
                            const sanitized = `${new Date().toISOString().slice(0, 10)}_${rawFileName.replace(/[^a-zA-Z0-9._-]/g, '_')}`;
                            const fullPath = path.join(targetDir, sanitized);

                            const buffer = await downloadMediaMessage(
                                msg,
                                'buffer',
                                {},
                                { logger, reuploadRequest: sock?.updateMediaMessage }
                            );
                            if (buffer) {
                                fs.writeFileSync(fullPath, buffer);
                                savedFilePath = fullPath;
                                console.log(`[Baileys] Auto-saved incoming report to: ${fullPath}`);
                            }
                        } catch (downErr) {
                            console.error('[Baileys] Attachment download notice:', downErr.message);
                        }
                    }

                    const msgRecord = {
                        message_id: msgId,
                        chat_jid: remoteJid,
                        chat_name: isGroup ? 'WhatsApp Group' : senderName,
                        sender_jid: senderJid,
                        sender_name: senderName,
                        message_text: text.trim(),
                        timestamp: new Date(timestampSeconds * 1000).toISOString(),
                        is_group: isGroup,
                        is_read: false,
                        has_attachment: hasAttachment,
                        attachment_path: savedFilePath
                    };

                    if (!unreadMessagesStore.some(m => m.message_id === msgRecord.message_id)) {
                        unreadMessagesStore.unshift(msgRecord);
                        if (unreadMessagesStore.length > 500) unreadMessagesStore.pop();
                        console.log(`[Baileys] Captured incoming message from ${senderName}: "${text.substring(0, 50)}"`);
                        forwardToFastAPI(msgRecord);
                    }
                }
            } catch (err) {
                console.error('[Baileys] Error processing incoming messages.upsert:', err);
            }
        });
    } catch (e) {
        console.error('[Baileys] Fatal socket initialization error:', e);
        connectionState = 'DISCONNECTED';
        lastError = e.message;
    }
}

// Check on startup if existing auth exists
try {
    const credsPath = path.join(AUTH_DIR, 'creds.json');
    if (fs.existsSync(credsPath)) {
        console.log('[Baileys] Resuming persistent session from creds.json...');
        initBaileysSocket(false);
    }
} catch (e) {
    console.error('[Baileys] Startup auth check error:', e);
}

// Microservice HTTP Server
const server = http.createServer(async (req, res) => {
    const parsedUrl = url.parse(req.url, true);
    const pathname = parsedUrl.pathname;
    const method = req.method;

    const sendJson = (statusCode, data) => {
        res.writeHead(statusCode, {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
            'Access-Control-Allow-Headers': 'Content-Type, Authorization'
        });
        res.end(JSON.stringify(data));
    };

    if (method === 'OPTIONS') {
        res.writeHead(204, {
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
            'Access-Control-Allow-Headers': 'Content-Type, Authorization'
        });
        return res.end();
    }

    // 1. Live Status
    if (pathname === '/status' && method === 'GET') {
        const isQrReady = Boolean(currentQR && connectionState !== 'CONNECTED');
        return sendJson(200, {
            state: connectionState === 'CONNECTED' ? 'CONNECTED' : (isQrReady ? 'QR_READY' : connectionState),
            connected: connectionState === 'CONNECTED',
            user: connectedUser,
            qr: isQrReady ? currentQR : null,
            pairingCode: currentPairingCode,
            error: lastError
        });
    }

    // 2. Start / Generate QR Code Session
    if (pathname === '/start-session' && method === 'POST') {
        if (connectionState === 'CONNECTED') {
            return sendJson(200, {
                status: 'CONNECTED',
                message: 'Already connected',
                user: connectedUser
            });
        }

        await initBaileysSocket(true);

        // Wait up to 6 seconds for the initial QR to render
        for (let i = 0; i < 12; i++) {
            if (currentQR || connectionState === 'CONNECTED') break;
            await new Promise(r => setTimeout(r, 500));
        }

        return sendJson(200, {
            status: connectionState === 'CONNECTED' ? 'CONNECTED' : (currentQR ? 'QR_READY' : connectionState),
            qr: currentQR,
            user: connectedUser,
            error: lastError
        });
    }

    // 3. Request 8-Digit Pairing Code (Phone Number based linking)
    if (pathname === '/request-pairing-code' && method === 'POST') {
        let body = '';
        req.on('data', chunk => { body += chunk.toString(); });
        req.on('end', async () => {
            try {
                const data = JSON.parse(body || '{}');
                const rawPhone = data.phoneNumber || data.phone || '';
                const cleanPhone = String(rawPhone).replace(/[^0-9]/g, '');

                if (!cleanPhone || cleanPhone.length < 10) {
                    return sendJson(400, {
                        success: false,
                        error: 'Please provide a valid phone number with country code (e.g. 919876543210).'
                    });
                }

                if (connectionState === 'CONNECTED') {
                    return sendJson(200, {
                        success: true,
                        status: 'CONNECTED',
                        message: 'Already connected',
                        user: connectedUser
                    });
                }

                // If socket not active, start it
                if (!sock) {
                    await initBaileysSocket(true);
                    await new Promise(r => setTimeout(r, 2000));
                }

                if (!sock.requestPairingCode) {
                    return sendJson(500, {
                        success: false,
                        error: 'Pairing code is not supported by the current WhatsApp protocol version.'
                    });
                }

                // Request 8-digit code from WhatsApp Web
                let rawCode = await sock.requestPairingCode(cleanPhone);
                const formattedCode = rawCode?.match(/.{1,4}/g)?.join('-') || rawCode;

                currentPairingCode = formattedCode;
                connectionState = 'PAIRING_CODE_READY';
                console.log(`[Baileys] Generated phone pairing code: ${formattedCode} for +${cleanPhone}`);

                return sendJson(200, {
                    success: true,
                    status: 'PAIRING_CODE_READY',
                    pairingCode: formattedCode,
                    phoneNumber: cleanPhone
                });
            } catch (err) {
                console.error('[Baileys] Error requesting pairing code:', err);
                return sendJson(500, {
                    success: false,
                    error: `Pairing code generation failed: ${err.message}`
                });
            }
        });
        return;
    }

    // 4. Disconnect / Logout
    if (pathname === '/logout' && method === 'POST') {
        try {
            if (sock) {
                await sock.logout();
            }
        } catch (err) {}
        try {
            fs.rmSync(AUTH_DIR, { recursive: true, force: true });
        } catch (err) {}
        connectionState = 'DISCONNECTED';
        connectedUser = null;
        currentQR = null;
        currentRawQR = null;
        currentPairingCode = null;
        return sendJson(200, { success: true, message: 'Logged out successfully' });
    }

    // 5. Fetch Real Joined Groups
    if (pathname === '/groups' && method === 'GET') {
        if (connectionState !== 'CONNECTED' || !sock) {
            return sendJson(400, {
                success: false,
                error: 'WhatsApp is not connected. Please scan QR code or enter pairing code first.'
            });
        }
        try {
            const groupsDict = await sock.groupFetchAllParticipating();
            const groupsList = Object.values(groupsDict).map(g => ({
                id: g.id,
                name: g.subject,
                participants_count: g.participants ? g.participants.length : 0,
                creation: g.creation,
                owner: g.owner,
                is_pmsc: (g.subject || '').toLowerCase().includes('pmsc')
            }));

            // Prioritize Team PMSC groups
            groupsList.sort((a, b) => (b.is_pmsc ? 1 : 0) - (a.is_pmsc ? 1 : 0));

            return sendJson(200, {
                success: true,
                count: groupsList.length,
                groups: groupsList
            });
        } catch (gErr) {
            console.error('[Baileys] Error fetching groups:', gErr);
            return sendJson(500, {
                success: false,
                error: `Failed to fetch WhatsApp groups: ${gErr.message}`
            });
        }
    }

    // 6. Send Message to Real Group
    if (pathname === '/send-message' && method === 'POST') {
        let body = '';
        req.on('data', chunk => { body += chunk.toString(); });
        req.on('end', async () => {
            try {
                const data = JSON.parse(body || '{}');
                const targetJid = data.jid;
                const messageText = data.text;

                if (connectionState !== 'CONNECTED' || !sock) {
                    return sendJson(400, {
                        success: false,
                        error: 'Cannot send message: WhatsApp session is not connected. Please link your phone first.'
                    });
                }

                if (!targetJid || !messageText) {
                    return sendJson(400, {
                        success: false,
                        error: 'Missing required fields: jid and text'
                    });
                }

                const result = await sock.sendMessage(targetJid, { text: messageText });

                return sendJson(200, {
                    success: true,
                    status: 'DELIVERED',
                    messageId: result.key.id,
                    targetJid: targetJid,
                    timestamp: result.messageTimestamp
                });
            } catch (sendErr) {
                console.error('[Baileys] Dispatch failed:', sendErr);
                return sendJson(500, {
                    success: false,
                    error: `Message dispatch failed: ${sendErr.message}`
                });
            }
        });
        return;
    }

    // 7. Get Tracked Unread Messages
    if (pathname === '/unread-messages' && method === 'GET') {
        const unread = unreadMessagesStore.filter(m => !m.is_read);
        return sendJson(200, {
            success: true,
            connected: connectionState === 'CONNECTED',
            count: unread.length,
            messages: unread
        });
    }

    // 8. Mark Messages as Read
    if (pathname === '/mark-read' && method === 'POST') {
        let body = '';
        req.on('data', chunk => { body += chunk.toString(); });
        req.on('end', () => {
            try {
                const data = JSON.parse(body || '{}');
                const { message_ids, mark_all } = data;
                let count = 0;
                unreadMessagesStore.forEach(m => {
                    if (mark_all || (message_ids && message_ids.includes(m.message_id))) {
                        if (!m.is_read) count++;
                        m.is_read = true;
                    }
                });
                return sendJson(200, {
                    success: true,
                    marked_count: count,
                    remaining_unread: unreadMessagesStore.filter(m => !m.is_read).length
                });
            } catch (err) {
                return sendJson(400, { success: false, error: err.message });
            }
        });
        return;
    }

    return sendJson(404, { error: 'Route not found' });
});

server.listen(PORT, '127.0.0.1', () => {
    console.log(`[Baileys Bridge] Running on http://127.0.0.1:${PORT}`);
});
