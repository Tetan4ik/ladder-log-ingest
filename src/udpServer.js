import dgram from 'node:dgram';
import {enqueueLogRow} from './clickhouseWriter.js';

/**
 * @param {Buffer} buf
 * @returns {number} принято строк
 */
export function handleUdpPayload(buf) {
    const text = buf.toString('utf8').trim();
    if (!text) {
        return 0;
    }

    let accepted = 0;
    const lines = text.includes('\n') ? text.split('\n') : [text];
    for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed) {
            continue;
        }
        try {
            const packet = JSON.parse(trimmed);
            if (packet?.v !== 1 || !packet.row || typeof packet.row !== 'object') {
                continue;
            }
            const row = packet.row;
            if (!row.category || row.message == null) {
                continue;
            }
            enqueueLogRow(row);
            accepted += 1;
        } catch {
            // битый пакет — пропускаем
        }
    }
    return accepted;
}

/**
 * @param {number} port
 * @param {string} [host]
 */
export function startUdpServer(port, host = '0.0.0.0') {
    const socket = dgram.createSocket('udp4');

    socket.on('message', (msg) => {
        handleUdpPayload(msg);
    });

    socket.on('error', (err) => {
        console.error('[log-ingest] UDP error', err.message);
    });

    socket.bind(port, host, () => {
        console.log(`[log-ingest] UDP listening on ${host}:${port}`);
    });

    return socket;
}
