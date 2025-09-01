<h1 align="center">
  <br>
  <a href="https://github.com/GTSpray/P-titPote"><img src="https://github.com/GTSpray/P-titPote/blob/main/assets/ptitpote.png?raw=true" width="150px" alt="P'tit Pote Discord Bot"></a>
  <br>
  P'tit Pote Discord Bot
  <br>
</h1>

## Running app locally

Before you start, you'll need to install [NodeJS](https://nodejs.org/en/download/), [Docker](https://www.docker.com/) (or [Podman](https://podman.io/)) and [create a Discord app](https://discord.com/developers/applications) with the proper permissions:
- `applications.commands`
- `bot` (with Send Messages enabled)

And permissions: 

- Manage Messages
- Send Messages
- Use external Emojis


Configuring the app is covered in detail in the [getting started guide](https://discord.com/developers/docs/getting-started).


### Setup project

First clone the project:
Then navigate to its directory and install dependencies:

```
docker-compose up -d --build --force-recreate --no-deps
```

### Docker usage

```
docker-compose up -d --build --force-recreate --no-deps
```
or :
```
docker-compose up -d
```

#### Usefull docker-compose commands :

```
docker-compose restart ptitpot

docker-compose down --volumes

docker-compose logs -f ptitpote

docker-compose exec ptitpote bash
```

for development usage:

```
docker-compose -f docker-compose.yml -f dev.yml up -d --build --force-recreate --no-deps
```

> ⚙️ A package [like `nodemon`](https://github.com/remy/nodemon), which watches for local changes and restarts your app, may be helpful while locally developing.


### Get app credentials

Fetch the credentials from your app's settings and add them to a `.env` file (see `.env.sample` for an example). You'll need your app ID (`APP_ID`), bot token (`BOT_TOKEN`), and public key (`PUBLIC_KEY`).

Fetching credentials is covered in detail in the [getting started guide](https://discord.com/developers/docs/getting-started).

> 🔑 Environment variables can be added to the `.env` file in Glitch or when developing locally, and in the Secrets tab in Replit (the lock icon on the left).

### Install slash commands

will be installed when you run the `register` command configured in `package.json`:

```
docker-compose exec ptitpote npm run register
```

### Local tunnel with docker environment  

Try to use tunnel services like ngrok, localtunnel, etc...

Copy the forwarding address that starts with `https`, in this case `https://<LOCALTUNNEL_SUBDOMAIN>.loca.lt`, then go to your [app's settings](https://discord.com/developers/applications).

On the **General Information** tab, there will be an **Interactions Endpoint URL**. Paste your ngrok address there, and append `/interactions` to it (`https://<LOCALTUNNEL_SUBDOMAIN>.loca.lt/interactions` in the example).

Click **Save Changes**, and your app should be ready to run 🚀

## Other resources
- Read **[the documentation](https://discord.com/developers/docs/intro)** for in-depth information about API features.
- Browse the `examples/` folder in this project for smaller, feature-specific code examples
- Join the **[Discord Developers server](https://discord.gg/discord-developers)** to ask questions about the API, attend events hosted by the Discord API team, and interact with other devs.
- Check out **[community resources](https://discord.com/developers/docs/topics/community-resources#community-resources)** for language-specific tools maintained by community members.
