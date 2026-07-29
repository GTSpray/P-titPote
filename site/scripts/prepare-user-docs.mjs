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
const landingSource = join(siteRoot, 'index.md');

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

function prepareCommand(commandName) {
  const commandDir = join(usageRoot, commandName);
  const sourceMd = join(commandDir, `${commandName}.md`);
  if (!existsSync(sourceMd)) {
    console.warn(`skip ${commandName}: missing ${sourceMd}`);
    return;
  }

  const destDir = join(contentRoot, commandName);
  mkdirSync(destDir, { recursive: true });
  copyMedia(commandDir, destDir);

  let markdown = readFileSync(sourceMd, 'utf8');
  markdown = stripImplementationMap(markdown);
  markdown = rewriteGifImagesToVideo(markdown, destDir);
  writeFileSync(join(destDir, 'index.md'), markdown);

  console.log(`prepared ${commandName}`);
}

function main() {
  rmSync(contentRoot, { recursive: true, force: true });
  mkdirSync(contentRoot, { recursive: true });

  cpSync(landingSource, join(contentRoot, 'index.md'));

  const commands = readdirSync(usageRoot, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => entry.name)
    .sort();

  for (const commandName of commands) {
    prepareCommand(commandName);
  }
}

main();
