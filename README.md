<h1 align="center">
  <br>
  <a href="https://github.com/GTSpray/P-titPote"><img src="https://github.com/GTSpray/P-titPote/blob/main/assets/ptitpote.png?raw=true" width="150px" alt="P'tit Pote Discord Bot"></a>
  <br>
  P'tit Pote Discord Bot
  <br>
</h1>

# Running app locally

Before you start, you'll need to install [NodeJS](https://nodejs.org/en/download/), [Docker](https://www.docker.com/) (or [Podman](https://podman.io/)) and [create a Discord app](https://discord.com/developers/applications) with the proper permissions:

- `applications.commands`
- `bot` (with Send Messages enabled)

And permissions:

- Manage Messages
- Send Messages
- Use external Emojis

Configuring the app is covered in detail in the [getting started guide](https://discord.com/developers/docs/getting-started).

## Setup project

First clone the project:
Then navigate to its directory and install dependencies.

### Get app credentials

Fetch the credentials from your app's settings and add them to a `.env` file (see `.env.sample` for an example). You'll need your app ID (`APP_ID`), bot token (`BOT_TOKEN`), and public key (`PUBLIC_KEY`).

Fetching credentials is covered in detail in the [getting started guide](https://discord.com/developers/docs/getting-started).

> 🔑 Environment variables can be added to the `.env` file in Glitch or when developing locally, and in the Secrets tab in Replit (the lock icon on the left).

### Local tunnel with docker environment

Try to use tunnel services like ngrok, localtunnel, etc...

Copy the forwarding address that starts with `https`, in this case `https://<LOCALTUNNEL_SUBDOMAIN>.loca.lt`, then go to your [app's settings](https://discord.com/developers/applications).

On the **General Information** tab, there will be an **Interactions Endpoint URL**. Paste your localtunnel address there, and append `/interactions` to it (`https://<LOCALTUNNEL_SUBDOMAIN>.loca.lt/interactions` in the example).

Click **Save Changes**, and your app should be ready to run 🚀

> 🔑 LOCALTUNNEL_SUBDOMAIN variable can be added to the `.env` file to ensure static subdomain localtunnel and permanent interaction url. See [localtunnel status page](https://status.loca.lt/)

## Usage

### Production mode

Launch application using :

```bash
make start
```

and stop

```bash
make stop
```

Slash commands will be installed when you run the `register` command :

```bash
make register
```

### Development mode

Launch development container using :

```bash
make dev
```

keep your code transpiled with :

```bash
make build
```

test your code using :

```bash
make test
```

or (in watch mode)

```bash
make testw
```

> ⚙️ A package [like `nodemon`](https://github.com/remy/nodemon), which watches for local changes and restarts your app, may be helpful while locally developing.

#### Database managment

See [schema-generator](https://mikro-orm.io/docs/schema-generator)

```bash
make sh
npx mikro-orm schema:create --dump   # Dumps create schema SQL
npx mikro-orm schema:update --dump   # Dumps update schema SQL
npx mikro-orm schema:drop --dump     # Dumps drop schema SQL
```

## Other resources

- Read **[the documentation](https://discord.com/developers/docs/intro)** for in-depth information about API features.
- Join the **[Discord Developers server](https://discord.gg/discord-developers)** to ask questions about the API, attend events hosted by the Discord API team, and interact with other devs.
- Check out **[community resources](https://discord.com/developers/docs/topics/community-resources#community-resources)** for language-specific tools maintained by community members.
- Read **[localtunnel](https://github.com/localtunnel/localtunnel)**
