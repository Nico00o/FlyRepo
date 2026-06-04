# Railway setup

Railway can restart a deploy and lose files saved inside the app folder. If the bot stores channel config in the default `data` folder, channels can disappear after a restart.

To keep channel configs:

1. Create a Railway Volume.
2. Mount it to a fixed path, for example `/data`.
3. Add this Railway variable:

```text
BOT_DATA_DIR=/data
```

4. Redeploy the bot.
5. Re-add your channels with `/channel add`.

After that, `/channel add`, `/channel list`, and the monitor will all use the persistent file:

```text
/data/guild-configs.json
```
