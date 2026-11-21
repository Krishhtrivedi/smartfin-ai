const http = require('http');
const url = require('url');
const fs = require('fs');
const path = require('path');
const QRCode = require('qrcode');
const {
    default: makeWASocket,
    DisconnectReason,
    useMultiFileAuthState,
    fetchLatestBaileysVersion
} = require('@whiskeysockets/baileys');
const pino = require('pino');

const PORT = process.env.WHATSAPP_BRIDGE_PORT || 8001;
const AUTH_DIR = process.env.WHATSAPP_SESSION_DIR || path.join(__dirname, 'session_auth');

if (!fs.existsSync(AUTH_DIR)) {
    fs.mkdirSync(AUTH_DIR, { recursive: true });
}

let sock = null;
let currentQR = null;
let connectionState = 'DISCONNECTED'; // DISCONNECTED, QR_READY, CONNECTING, CONNECTED
let connectedUser = null;
let lastError = null;

const logger = pino({ level: 'silent' });

async function initBaileysSocket(forceNew = false) {
    try {
        if (forceNew && fs.existsSync(AUTH_DIR)) {
            try {
                fs.rmSync(AUTH_DIR, { recursive: true, force: true });
                fs.mkdirSync(AUTH_DIR, { recursive: true });
            } catch (err) {
                console.error('Failed to clear auth dir:', err);
            }
        }

        const { state, saveCreds } = await useMultiFileAuthState(AUTH_DIR);
        const { version } = await fetchLatestBaileysVersion();

        sock = makeWASocket({
            version,
            logger,
            printQRInTerminal: false,
            auth: state,
            browser: ['SmartFin.AI', 'Chrome', '1.0.0'],
            syncFullHistory: false
        });

        sock.ev.on('creds.update', saveCreds);

        sock.ev.on('connection.update', async (update) => {
            const { connection, lastDisconnect, qr } = update;

            if (qr) {
                try {
                    currentQR = await QRCode.toDataURL(qr);
                    connectionState = 'QR_READY';
                    console.log('[Baileys] New QR Code generated for scanning.');
                } catch (qrErr) {
                    console.error('[Baileys] Error generating QR data URL:', qrErr);
                }
            }

            if (connection === 'connecting') {
                if (connectionState !== 'QR_READY') {
                    connectionState = 'CONNECTING';
                }
                console.log('[Baileys] WhatsApp socket connecting...');
            }

            if (connection === 'open') {
                connectionState = 'CONNECTED';
                currentQR = null;
                lastError = null;
                if (sock.user) {
                    const phoneNumber = sock.user.id ? sock.user.id.split(':')[0].split('@')[0] : 'Office WhatsApp';
                    connectedUser = {
                        jid: sock.user.id,
                        phone: `+${phoneNumber}`,
                        name: sock.user.name || 'Office WhatsApp Device'
                    };
                    console.log(`[Baileys] Connected successfully as ${connectedUser.phone} (${connectedUser.name})`);
                }
            }

            if (connection === 'close') {
                const statusCode = lastDisconnect?.error?.output?.statusCode;
                const shouldReconnect = statusCode !== DisconnectReason.loggedOut;
                console.log(`[Baileys] Connection closed. Reason: ${statusCode}, reconnect: ${shouldReconnect}`);

                if (statusCode === DisconnectReason.loggedOut) {
                    connectionState = 'DISCONNECTED';
                    connectedUser = null;
                    currentQR = null;
                    lastError = 'Session logged out from phone. Please scan QR again.';
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
    } catch (e) {
        console.error('[Baileys] Error starting socket:', e);
        connectionState = 'DISCONNECTED';
        lastError = e.message;
    }
}

// Check on startup if existing auth exists
try {
    const credsPath = path.join(AUTH_DIR, 'creds.json');
    if (fs.existsSync(credsPath)) {
        console.log('[Baileys] Existing credentials found. Resuming session...');
        initBaileysSocket(false);
    }
} catch (e) {
    console.error('[Baileys] Startup creds check error:', e);
}

// HTTP Server for Python/FastAPI bridge communication
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

    // 1. Status
    if (pathname === '/status' && method === 'GET') {
        return sendJson(200, {
            state: connectionState,
            connected: connectionState === 'CONNECTED',
            user: connectedUser,
            qr: connectionState === 'AWAITING_QR' ? currentQR : null,
            error: lastError
        });
    }

    // 2. Start / Generate QR
    if (pathname === '/start-session' && method === 'POST') {
        if (connectionState === 'CONNECTED') {
            return sendJson(200, {
                status: 'CONNECTED',
                message: 'Already connected',
                user: connectedUser
            });
        }
        await initBaileysSocket(true);
        // Wait up to 3 seconds for QR code generation
        for (let i = 0; i < 6; i++) {
            if (currentQR || connectionState === 'CONNECTED') break;
            await new Promise(r => setTimeout(r, 500));
        }
        return sendJson(200, {
            status: connectionState,
            qr: currentQR,
            user: connectedUser,
            error: lastError
        });
    }

    // 3. Disconnect / Logout
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
        return sendJson(200, { success: true, message: 'Logged out successfully' });
    }

    // 4. Fetch Participating Groups
    if (pathname === '/groups' && method === 'GET') {
        if (connectionState !== 'CONNECTED' || !sock) {
            return sendJson(400, {
                success: false,
                error: 'WhatsApp is not connected. Please scan QR code first.'
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

            // Sort so PMSC groups come first
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

    // 5. Send Real Message
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
                        error: 'Cannot send message: WhatsApp session is not active. Please scan QR code first.'
                    });
                }

                if (!targetJid || !messageText) {
                    return sendJson(400, {
                        success: false,
                        error: 'Missing required fields: jid and text'
                    });
                }

                // Strictly dispatch real message
                const result = await sock.sendMessage(targetJid, { text: messageText });

                return sendJson(200, {
                    success: true,
                    status: 'DELIVERED',
                    messageId: result.key.id,
                    targetJid: targetJid,
                    timestamp: result.messageTimestamp
                });
            } catch (sendErr) {
                console.error('[Baileys] Real dispatch failed:', sendErr);
                return sendJson(500, {
                    success: false,
                    error: `Message dispatch failed: ${sendErr.message}`
                });
            }
        });
        return;
    }

    return sendJson(404, { error: 'Route not found' });
});

server.listen(PORT, '127.0.0.1', () => {
    console.log(`[Baileys Bridge] Running on http://127.0.0.1:${PORT}`);
});
