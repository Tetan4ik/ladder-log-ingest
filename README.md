# ladder-log-ingest

Приём логов по **UDP** и запись в ClickHouse (`application_logs`).

```bash
cp .env.example .env
npm install
npm start
```

Протокол: `{"v":1,"row":{...}}` — см. `docs/protocol.md` (или комментарии в `src/udpServer.js`).

| Переменная | По умолчанию |
|------------|----------------|
| `LOG_UDP_PORT` | `30999` |

Клиенты задают `LOG_UDP_HOST` / `LOG_UDP_PORT` и шлют пакеты без ожидания ответа.
