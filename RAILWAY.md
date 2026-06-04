# Railway setup

If `/channel add` works but `/channel list` returns `0/3` with a different instance id, Railway is running more than one bot instance. A file or Volume can still fail in that setup because each instance may answer a different Discord command.

Use PostgreSQL so every instance reads and writes the same config.

## Recommended fix

1. Add a PostgreSQL database to the Railway project.
2. Make sure the bot service has the `DATABASE_URL` variable from that database.
3. Redeploy the bot.
4. Re-add your channels with `/channel add`.
5. Run `/channel list`.

When `DATABASE_URL` exists, the bot automatically stores channel configs in PostgreSQL.

## Alternative

You can also set the Railway service to one single replica/instance. Then a Volume mounted at `/data` with `BOT_DATA_DIR=/data` can work, but PostgreSQL is safer.
