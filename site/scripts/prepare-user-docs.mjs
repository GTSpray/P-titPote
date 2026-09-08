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
const logoSource = join(repoRoot, 'assets', 'ptitpote.png');
const usageReadmeSource = join(usageRoot, 'README.md');
const generatedNavPath = join(siteRoot, '.vitepress', 'generated-nav.json');

const MEDIA_EXTENSIONS = new Set(['.gif', '.webm', '.png']);

const COMMAND_BLURBS = {
  poll: 'create polls, vote, and view reports',
  alias: 'store and post reusable message aliases',
  gimme: 'otter image, emoji gallery, and version',
};

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

function rewriteUsageHomeForSite(markdown) {
  return markdown
    .replace(/src="\.\.\/\.\.\/assets\/ptitpote\.png"/g, 'src="/ptitpote.png"')
    .replace(/\(\.\/([a-z0-9-]+)\/\1\.md\)/g, '(/$1/)');
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
  if (!existsSync(usageReadmeSource)) {
    throw new Error(`Missing usage home at ${usageReadmeSource}`);
  }

  const body = rewriteUsageHomeForSite(readFileSync(usageReadmeSource, 'utf8'));
  return `---
sidebar: false
aside: false
---

${body.trim()}
`;
}

function buildCommandsIndex(commands) {
  const items = commands
    .map((name) => {
      const blurb = COMMAND_BLURBS[name] ?? `guide for \`/${name}\``;
      return `- [\`/${name}\`](/${name}/) — ${blurb}`;
    })
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
  if (!existsSync(logoSource)) {
    throw new Error(`Missing brand logo at ${logoSource}`);
  }
  cpSync(logoSource, join(publicRoot, 'ptitpote.png'));
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
