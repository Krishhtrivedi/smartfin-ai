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
let currentRawQR = null;
let currentPairingCode = null;
let connectionState = 'DISCONNECTED'; // DISCONNECTED, QR_READY, PAIRING_CODE_READY, CONNECTING, CONNECTED
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

    return sendJson(404, { error: 'Route not found' });
});

server.listen(PORT, '127.0.0.1', () => {
    console.log(`[Baileys Bridge] Running on http://127.0.0.1:${PORT}`);
});
