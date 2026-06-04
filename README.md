# GitHub Activity Discord Bot

Bot de Discord para publicar automaticamente commits nuevos de repositorios de GitHub en un canal elegido por comando.

## Importante

El token que pegaste en el chat debe considerarse filtrado. Regeneralo en Discord Developer Portal y usa el token nuevo en `.env`.

## Instalacion

```bash
npm.cmd install
```

## Configuracion

1. Copia `.env.example` a `.env`.
2. Completa:
   - `DISCORD_TOKEN`: token nuevo del bot.
   - `DISCORD_CLIENT_ID`: Application ID / Client ID del bot en Discord Developer Portal.
   - `GITHUB_TOKEN`: opcional.
   - `BOT_STATUS`, `BOT_PRESENCE_TEXT`: opcionales para el perfil/rich presence del bot.

## Perfil y rich presence

Al iniciar, el bot muestra una presencia de Discord estilo GitHub y la va rotando automaticamente:

- Playing: texto configurable, por defecto `GitHub Monitor`.
- Watching: cantidad de repositorios monitoreados.
- Listening: cantidad de canales donde publica commits.

Para que el perfil se vea mejor en Discord Developer Portal, tambien podes configurar nombre, avatar y descripcion de la aplicacion desde la seccion del bot. La presencia se maneja desde el codigo y las variables `.env`.

## Registrar comandos

```bash
npm.cmd run deploy
```

## Iniciar

```bash
npm.cmd start
```

## Comandos principales

- `/help` muestra una ayuda interactiva con botones.
- `/channel add canal repo branch frecuencia` agrega o actualiza un canal monitoreado.
- `/channel remove canal` elimina un canal monitoreado.
- `/channel list` muestra hasta 3 canales configurados.
- `/channel settings canal` muestra la configuracion de un canal.
- `/github-watch repo canal branch` atajo para configurar un repositorio y canal.
- `/github-check` revisa GitHub en ese momento y publica commits pendientes.
- `/github-status` muestra el estado actual.
- `/github-stop` detiene todas las publicaciones del servidor.
- `/repo dashboard repo` muestra dashboard del repositorio.
- `/repo analytics repo` muestra actividad reciente.
- `/repo search query lenguaje estrellas` busca repositorios.
- `/ranking repo` muestra contributors.
- `/compare-contributors usuario1 usuario2 repo` compara contributors.

Ejemplo:

```text
/github-watch repo:openai/openai-node canal:#commits branch:main
```

El bot revisa GitHub cada pocos minutos y publica los commits nuevos con autor, rama, mensaje y enlace.

Cada commit incluye botones para ver detalles avanzados y archivos modificados.
