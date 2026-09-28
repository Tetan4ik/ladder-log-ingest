const FLUSH_INTERVAL_MS = 150;
const MAX_BUFFER = 200;

/** @type {import('@clickhouse/client').ClickHouseClient | null} */
let client = null;
let schemaReady = null;
/** @type {object[]} */
let buffer = [];
let flushTimer = null;
let flushChain = Promise.resolve();

function env(name, fallback) {
    const v = process.env[name];
    return v !== undefined && v !== '' ? v : fallback;
}

async function getClient() {
    if (client) {
        return client;
    }
    const {createClient} = await import('@clickhouse/client');
    client = createClient({
        url: `http://${env('CLICKHOUSE_HOST', '127.0.0.1')}:${env('CLICKHOUSE_PORT', '8123')}`,
        username: env('CLICKHOUSE_USER', 'logs'),
        password: env('CLICKHOUSE_PASSWORD', 'logs'),
        database: env('CLICKHOUSE_DATABASE', 'ladder_logs'),
    });
    return client;
}

export async function ensureSchema() {
    if (schemaReady) {
        return schemaReady;
    }
    schemaReady = (async () => {
        const ch = await getClient();
        await ch.command({query: 'CREATE DATABASE IF NOT EXISTS ladder_logs'});
        await ch.command({
            query: `
                CREATE TABLE IF NOT EXISTS application_logs
                (
                    event_time DateTime64(3, 'Europe/Moscow'),
                    category LowCardinality(String),
                    level LowCardinality(String),
                    message String,
                    chat_id String DEFAULT '',
                    ticker String DEFAULT '',
                    service_role LowCardinality(String),
                    caller_service LowCardinality(String) DEFAULT '',
                    callee_service LowCardinality(String) DEFAULT '',
                    http_method LowCardinality(String) DEFAULT '',
                    http_path String DEFAULT '',
                    http_status UInt16 DEFAULT 0,
                    s2s_direction LowCardinality(String) DEFAULT '',
                    hostname LowCardinality(String),
                    pid UInt32,
                    sandbox_mode UInt8 DEFAULT 0,
                    real_trading UInt8 DEFAULT 0,
                    kind LowCardinality(String),
                    details String DEFAULT '{}'
                )
                ENGINE = MergeTree()
                PARTITION BY toYYYYMM(event_time)
                ORDER BY (category, event_time, chat_id)
            `,
        });
    })().catch((err) => {
        schemaReady = null;
        throw err;
    });
    return schemaReady;
}

function scheduleFlush() {
    if (flushTimer) {
        return;
    }
    flushTimer = setTimeout(() => {
        flushTimer = null;
        flushChain = flushChain.then(() => flushBuffer()).catch((err) => {
            console.error('[log-ingest] flush failed', err.message || err);
        });
    }, FLUSH_INTERVAL_MS);
}

async function flushBuffer() {
    if (!buffer.length) {
        return;
    }
    const batch = buffer;
    buffer = [];
    await ensureSchema();
    const ch = await getClient();
    await ch.insert({table: 'application_logs', values: batch, format: 'JSONEachRow'});
}

export function enqueueLogRow(row) {
    buffer.push(row);
    if (buffer.length >= MAX_BUFFER) {
        flushChain = flushChain.then(() => flushBuffer());
    } else {
        scheduleFlush();
    }
}

export async function flushAll() {
    if (flushTimer) {
        clearTimeout(flushTimer);
        flushTimer = null;
    }
    await flushChain;
    await flushBuffer();
}
