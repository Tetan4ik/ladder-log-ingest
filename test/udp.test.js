import {describe, it} from 'node:test';
import assert from 'node:assert/strict';
import {handleUdpPayload} from '../src/udpServer.js';

describe('udp ingest', () => {
    it('принимает пакет v1', () => {
        const n = handleUdpPayload(Buffer.from(JSON.stringify({
            v: 1,
            row: {
                event_time: '2026-01-01 12:00:00.000',
                category: 'test',
                message: 'hello',
                level: 'info',
            },
        })));
        assert.equal(n, 1);
    });

    it('отклоняет неверную версию', () => {
        const n = handleUdpPayload(Buffer.from(JSON.stringify({v: 2, row: {}})));
        assert.equal(n, 0);
    });
});
