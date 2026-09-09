import {
  cpSync,
  existsSync,
  mkdirSync,
  readdirSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const siteRoot = join(__dirname, '..');
const repoRoot = join(siteRoot, '..');
const usageRoot = join(repoRoot, 'docs', 'usage');
const contentRoot = join(siteRoot, 'content');
const publicRoot = join(contentRoot, 'public');
const generatedNavPath = join(siteRoot, '.vitepress', 'generated-nav.json');

const MEDIA_EXTENSIONS = new Set(['.gif', '.webm', '.png']);

function stripImplementationMap(markdown) {
  return markdown.replace(/\n### Implementation map\n[\s\S]*$/, '\n');
}

function rewriteGifImagesToVideo(markdown, destDir) {
  return markdown.replace(
    /!\[([^\]]*)\]\(\.\/([^)\s]+)\.gif\)/g,
    (_match, alt, name) => {
      const img = `<img src="./${name}.gif" alt="${alt}" />`;
      if (!existsSync(join(destDir, `${name}.webm`))) {
        return img;
      }
      return [
        '<video controls autoplay loop muted playsinline>',
        `  <source src="./${name}.webm" type="video/webm" />`,
        `  ${img}`,
        '</video>',
      ].join('\n');
    },
  );
}

function copyMedia(commandDir, destDir) {
  for (const entry of readdirSync(commandDir, { withFileTypes: true })) {
    if (!entry.isFile()) continue;
    const ext = entry.name.slice(entry.name.lastIndexOf('.')).toLowerCase();
    if (!MEDIA_EXTENSIONS.has(ext)) continue;
    cpSync(join(commandDir, entry.name), join(destDir, entry.name));
  }
}

function listCommands() {
  return readdirSync(usageRoot, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => entry.name)
    .filter((name) => existsSync(join(usageRoot, name, `${name}.md`)))
    .sort();
}

function buildHomePage() {
  return `---
sidebar: false
aside: false
pageClass: pote-is-home
---

<div class="pote-home">
  <h1 class="pote-home__title">P'tit Pote</h1>
  <p class="pote-home__lead">
    A Discord bot for polls, reusable message aliases, and a few utilities —
    guides for server members and moderators.
  </p>
</div>
`;
}

function buildCommandsIndex(commands) {
  const items = commands
    .map((name) => `- [\`/${name}\`](/${name}/)`)
    .join('\n');

  return `# Commands

Slash commands available on P'tit Pote:

${items}
`;
}

function writeGeneratedNav(commands) {
  const items = commands.map((name) => ({
    text: `/${name}`,
    link: `/${name}/`,
  }));
  writeFileSync(
    generatedNavPath,
    `${JSON.stringify({ commands: items }, null, 2)}\n`,
  );
}

function prepareCommand(commandName) {
  const commandDir = join(usageRoot, commandName);
  const sourceMd = join(commandDir, `${commandName}.md`);
  const destDir = join(contentRoot, commandName);
  mkdirSync(destDir, { recursive: true });
  copyMedia(commandDir, destDir);

  let markdown = readFileSync(sourceMd, 'utf8');
  markdown = stripImplementationMap(markdown);
  markdown = rewriteGifImagesToVideo(markdown, destDir);
  writeFileSync(join(destDir, 'index.md'), markdown);

  console.log(`prepared ${commandName}`);
}

function copyBrandAssets() {
  mkdirSync(publicRoot, { recursive: true });
  const assetsDir = join(repoRoot, 'assets');
  for (const entry of readdirSync(assetsDir)) {
    if (!entry.startsWith('ptitpote') || !entry.endsWith('.png')) continue;
    cpSync(join(assetsDir, entry), join(publicRoot, entry));
  }
}

function main() {
  rmSync(contentRoot, { recursive: true, force: true });
  mkdirSync(contentRoot, { recursive: true });
  mkdirSync(join(siteRoot, '.vitepress'), { recursive: true });
  copyBrandAssets();

  const commands = listCommands();
  writeFileSync(join(contentRoot, 'index.md'), buildHomePage());
  mkdirSync(join(contentRoot, 'commands'), { recursive: true });
  writeFileSync(
    join(contentRoot, 'commands', 'index.md'),
    buildCommandsIndex(commands),
  );
  writeGeneratedNav(commands);

  for (const commandName of commands) {
    prepareCommand(commandName);
  }
}

main();
