// @ts-check
// Note: type annotations allow type checking and IDEs autocompletion

import { themes } from 'prism-react-renderer';
const lightCodeTheme = themes.github;
const darkCodeTheme = themes.dracula;

/** @type {import('@docusaurus/types').Config} */
const config = {
  i18n: {
    defaultLocale: 'es',
    locales: ['es'],
  },
  title: 'Brigada SOS!',
  tagline: 'Guía de aprendizaje de Japonés mediante la inmersión con contenido nativo',
  url: 'https://brigadasos.xyz',
  baseUrl: '/',
  onBrokenLinks: 'ignore',
  markdown: {
    hooks: {
      onBrokenMarkdownLinks: 'warn',
    },
  },
  favicon: 'img/favicon.ico',
  organizationName: 'BrigadaSOS Japonés', // Usually your GitHub org/user name.
  projectName: 'https://github.com/BrigadaSOS/brigadasos.xyz', // Usually your repo name.
  deploymentBranch: 'preview',
  plugins: [
    [
      require.resolve('@easyops-cn/docusaurus-search-local'),
      {
        hashed: true,
        language: ['es'],
        indexDocs: true,
        indexBlog: false,
        indexPages: false,
        docsRouteBasePath: ['/'],
        docsDir: 'docs',
      },
    ],
  ],
  presets: [
    [
      'classic',
      /** @type {import('@docusaurus/preset-classic').Options} */
      ({
        docs: {
          routeBasePath: '/',
          sidebarPath: require.resolve('./sidebars.js'),
          editUrl: 'https://github.com/BrigadaSOS/brigadasos.xyz/tree/main/',
        },
        blog: false,
        theme: {
          customCss: require.resolve('./src/css/custom.css'),
        },
      }),
    ],
  ],

  themeConfig:
    /** @type {import('@docusaurus/preset-classic').ThemeConfig} */
    ({
      /**
      announcementBar: {
        id: 'support_us',
        content:
          'We are looking to revamp our docs, please fill <a target="_blank" rel="noopener noreferrer" href="#">this survey</a>',
        backgroundColor: '#fafbfc',
        textColor: '#091E42',
        isCloseable: false,
      },*/

      colorMode: {
        defaultMode: 'dark',
        disableSwitch: true,
        respectPrefersColorScheme: false,
      },
      docs: {
        sidebar: {
          autoCollapseCategories: true,
        },
      },
      tableOfContents: {
        maxHeadingLevel: 5,
      },
      navbar: {
        hideOnScroll: false,
        title: 'Brigada SOS Japonés',
        logo: {
          alt: 'logo',
          src: 'img/favicon.ico',
        },
        items: [
          {
            href: 'https://github.com/BrigadaSOS/brigadasos.xyz',
            position: 'right',
            className: 'navbar-item-github',
            'aria-label': 'GitHub repository',
          },
          {
            href: 'https://discord.gg/ajWm26ADEj',
            className: 'navbar-item-discord',
            position: 'right',
          },
        ],
      },
      prism: {
        theme: lightCodeTheme,
        darkTheme: darkCodeTheme,
      },
    }),
};

export default config;
