const withNextra = require('nextra')({
  defaultShowCopyCode: true,
  theme: 'nextra-theme-docs',
  themeConfig: './theme.config.tsx',
  staticImage: true,
  latex: true,
  flexsearch: {
    codeblocks: false,
  },
})

const config = {
  // There were only 1 language, so no need to add this
  // i18n: {
  //   locales: ['zh-CN'],
  //   defaultLocale: 'zh-CN',
  // },
  reactStrictMode: true,
  typescript: {
    // Disable type checking since eslint handles this
    ignoreBuildErrors: true,
  },
  // async redirects() {
  //   return [
  //     {
  //       source: '/',
  //       destination: '/documents',
  //       permanent: true,
  //     },
  //   ]
  // },
}

module.exports = withNextra(config)
