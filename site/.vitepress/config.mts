import { defineConfig } from 'vitepress';

export default defineConfig({
  title: "P'tit Pote",
  description: "User guides for the P'tit Pote Discord bot",
  base: '/P-titPote/',
  srcDir: 'content',
  cleanUrls: true,
  themeConfig: {
    nav: [
      { text: 'Home', link: '/' },
      { text: 'Poll', link: '/poll/' },
      { text: 'Alias', link: '/alias/' },
      { text: 'Gimme', link: '/gimme/' },
      {
        text: 'GitHub',
        link: 'https://github.com/GTSpray/P-titPote',
      },
    ],
    sidebar: [
      {
        text: 'Commands',
        items: [
          { text: 'Poll', link: '/poll/' },
          { text: 'Alias', link: '/alias/' },
          { text: 'Gimme', link: '/gimme/' },
        ],
      },
    ],
    socialLinks: [
      {
        icon: 'github',
        link: 'https://github.com/GTSpray/P-titPote',
      },
    ],
  },
});
