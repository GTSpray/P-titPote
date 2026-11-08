# Documentation workflow

P'tit Pote keeps two documentation surfaces in the repository:

- `docs/usage/` is the source of truth for Discord users and moderators.
- `docs/` contains technical runbooks for contributors and operators.

The published user site is built from `docs/usage/` with VitePress in `site/`.
Do not edit generated site content directly.

## User guide source

Each public slash command has one guide:

```text
docs/usage/<command>/<command>.md
```

Examples:

- `docs/usage/poll/poll.md`
- `docs/usage/remind/remind.md`

Keep these guides focused on user-visible behavior: command flows,
permissions, buttons, modals, limits, and expected bot messages. Implementation
details belong in the matching technical guide under `docs/`.

When a Discord-visible command changes, update the guide and its playback
scenarios in the same PR. `docs/usage/README.md` is the command index for both
GitHub readers and the published site.

## Playback media

Usage guide scenarios live next to the command guide as JSON files. Regenerate
their media with:

```bash
make docs
```

The target pulls `ghcr.io/gtspray/fake-discord-front/doc-studio-capture:latest`
and captures each `docs/usage/*/*.json` scenario as GIF, WebM, and PNG files in
the same command directory.

Commit the scenario JSON and generated media when user-facing Discord UX
changes. Do not run this target for a purely technical doc edit.

## VitePress site build

Build the user docs site locally with:

```bash
make docs-site
```

This runs `npm ci && npm run build` in `site/`. The `site` package build first
runs `site/scripts/prepare-user-docs.mjs`, which:

1. Clears ignored generated content under `site/content/`.
2. Copies `assets/ptitpote*.png` into the site public assets.
3. Builds the site home page and `/commands/` index.
4. Discovers command directories that contain
   `docs/usage/<command>/<command>.md`.
5. Copies GIF, WebM, and PNG media into the matching site content directory.
6. Rewrites Markdown GIF images to `<video>` blocks when a matching WebM exists,
   leaving the GIF as the fallback.
7. Writes `site/.vitepress/generated-nav.json` for the command navigation.

Generated build output is ignored:

- `site/content`
- `site/.vitepress/dist`
- `site/.vitepress/cache`

`site/.vitepress/generated-nav.json` is tracked because VitePress imports it at
config load time. If adding or removing a usage guide changes command
navigation, run `make docs-site` or `cd site && npm run build` and commit the
updated nav file.

## Publishing

`.github/workflows/docs.yml` deploys the user site to GitHub Pages when changes
land on `main` that touch:

- `docs/usage/**`
- `site/**`
- `.github/workflows/docs.yml`

The workflow can also be run manually with `workflow_dispatch`. It installs
site dependencies, builds `site/.vitepress/dist`, uploads that directory as a
Pages artifact, then deploys it to the `github-pages` environment.

Technical docs under `docs/*.md` are not published to the VitePress site today.
They remain linked from `README.md`.

## Troubleshooting

| Symptom                            | Check                                                                                                           |
| ---------------------------------- | --------------------------------------------------------------------------------------------------------------- |
| New command missing from the site  | Ensure `docs/usage/<command>/<command>.md` exists, then rebuild the site so `generated-nav.json` updates.       |
| GIFs render instead of video       | Confirm a matching `.webm` exists beside the `.gif`; the prepare script only rewrites when the WebM is present. |
| Site build has stale pages locally | Remove ignored `site/content` and rerun `make docs-site`; the prepare script normally clears it first.          |
| GitHub Pages did not deploy        | Confirm the PR touched `docs/usage/**`, `site/**`, or the docs workflow, or run the workflow manually.          |
| `make docs` fails before capture   | Docker must be available because the capture target pulls and runs the doc-studio image.                        |
