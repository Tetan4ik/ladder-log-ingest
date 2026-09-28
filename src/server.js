import 'dotenv/config';
import {ensureSchema, flushAll} from './clickhouseWriter.js';
import {startUdpServer} from './udpServer.js';


const port = Number(process.env.LOG_UDP_PORT);
const host = process.env.LOG_UDP_HOST;

await ensureSchema();
startUdpServer(host, port);

process.on('SIGINT', async () => {
    await flushAll();
    process.exit(0);
});

process.on('SIGTERM', async () => {
    await flushAll();
    process.exit(0);
});
