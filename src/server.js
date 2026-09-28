import {ensureSchema, flushAll} from './clickhouseWriter.js';
import {startUdpServer} from './udpServer.js';

process.env.LADDER_SERVICE_NAME = process.env.LADDER_SERVICE_NAME || 'log-ingest';

const port = Number(process.env.LOG_UDP_PORT || 30999);

await ensureSchema();
startUdpServer(port);

process.on('SIGINT', async () => {
    await flushAll();
    process.exit(0);
});

process.on('SIGTERM', async () => {
    await flushAll();
    process.exit(0);
});
