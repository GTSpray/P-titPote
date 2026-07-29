import { defineConfig } from 'vitepress';
import generatedNav from './generated-nav.json';

const commandSidebar = [
  {
    text: 'Commands',
    items: [{ text: 'Overview', link: '/commands/' }, ...generatedNav.commands],
  },
];

const commandSidebars = Object.fromEntries([
  ['/commands/', commandSidebar],
  ...generatedNav.commands.map((item) => [item.link, commandSidebar]),
]);

export default defineConfig({
  title: "P'tit Pote",
  description: "User guides for the P'tit Pote Discord bot",
  base: '/P-titPote/',
  srcDir: 'content',
  cleanUrls: true,
  head: [
    [
      'link',
      { rel: 'icon', type: 'image/png', href: '/P-titPote/ptitpote.png' },
    ],
  ],
  themeConfig: {
    logo: {
      src: '/ptitpote.png',
      alt: "P'tit Pote",
    },
    siteTitle: "P'tit Pote",
    nav: [
      { text: 'Home', link: '/' },
      {
        text: 'Commands',
        items: [
          { text: 'Overview', link: '/commands/' },
          ...generatedNav.commands,
        ],
      },
    ],
    sidebar: commandSidebars,
    socialLinks: [
      {
        icon: 'github',
        link: 'https://github.com/GTSpray/P-titPote',
      },
    ],
  },
});
