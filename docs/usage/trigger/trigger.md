## Trigger Workflow

The `/trigger` command lets moderators configure automations that run when a
member joins the server: a welcome message in a channel, and/or an automatic
role.

### Intent

Triggers avoid manual onboarding steps. Each automation has a short name, a
type, and type-specific settings. Disabled triggers stay configured but do not
run until you update them again with `/trigger set`.

### Moderator flow

All `/trigger` subcommands require guild scope and moderator permissions. The
moderator check accepts members with at least one of these Discord permissions:
Administrator, Manage Server, Manage Channels, Manage Messages, Kick Members,
or Ban Members.

1. **Create or update an automation** with `/trigger set`:
   - Replies ephemerally with a select to choose the type (**Message de
     bienvenue** or **Rôle de bienvenue**).
   - After you pick a type, a modal asks for:
     - `name`: lowercase letters and digits only (`a-z`, `0-9`), 1–50
       characters;
     - welcome message: target channel + message text (1–2000 characters);
     - welcome role: role to assign.
   - Reusing an existing name updates that automation and re-enables it if it
     was disabled.
   - Success replies publicly with **Ok! C'est noté ;)**.

![Create trigger](./trigger-set.gif)

2. **Enable, disable, or delete an automation** with `/trigger rm`:
   - Opens a modal with two selects:
     - the automation (name, with type and actif/désactivé in the description);
     - the action: **Réactiver**, **Désactiver**, or **Supprimer**.
   - **Réactiver** turns a disabled automation back on without reconfiguring it.
   - **Désactiver** keeps the automation but stops it from running on join.
   - **Supprimer** removes it; the same name can be created again later.
   - If none exist, replies ephemerally with **Ahem... j'ai rien trouvé... 🤷**.

![Manage trigger](./trigger-rm.gif)

### Welcome message placeholders

In the welcome message text you can use:

- `{user}` — mention of the new member
- `{username}` — display username
- `{server}` — server name

### Constraints

- Guild-only: triggers are managed per Discord server.
- Names are unique per server among non-deleted triggers.
- Names must use lowercase letters and digits only.
- A server can store at most **10** non-deleted triggers (disabled ones count).
  Creating another one replies ephemerally with **Ahem... ca fait beaucoup là.
  Non?**; updating an existing name still works.
- Non-moderators receive an ephemeral **Ahem... je ne suis pas habilité à le
  faire 🤷** response before any subcommand runs.
- The bot needs the privileged **Server Members Intent** enabled in the Discord
  Developer Portal for join events to fire.

### Examples

```text
/trigger set  → select: Message de bienvenue
              → modal: name=welcome, channel=#général, message=Bienvenue {user} !
/trigger set  → select: Rôle de bienvenue
              → modal: name=member, role=@Membre
/trigger rm   → modal: trigger=welcome, action=Désactiver
/trigger rm   → modal: trigger=welcome, action=Réactiver
/trigger rm   → modal: trigger=member, action=Supprimer
```
