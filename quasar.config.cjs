/* eslint-env node */

// Configuration for Quasar app
// https://v2.quasar.dev/quasar-cli-vite/quasar-config-js

const { readFileSync } = require('fs')
const { join } = require('path')

// Read package.json version
const packageJson = JSON.parse(readFileSync(join(__dirname, 'package.json'), 'utf-8'))

module.exports = function (ctx) {
  return {
    // TypeScript is auto-detected in @quasar/app-vite v2

    boot: [
      'axios',
      'i18n',
      'app-init',
      { path: 'electron-ipc', server: false }
    ],

    css: [
      'app.scss'
    ],

    extras: [
      'roboto-font',
      'material-icons',
      'mdi-v7',
      'fontawesome-v6'
    ],

    build: {
      target: {
        browser: ['es2022', 'chrome90', 'firefox88', 'safari14'],
        node: 'node20'
      },

      vueRouterMode: 'hash', // available values: 'hash', 'history'

      // Set base path for GitHub Pages deployment
      publicPath: ctx.mode.pwa ? '/Qepton/' : '/',

      extendViteConf (viteConf) {
        viteConf.define = viteConf.define || {}
        viteConf.define.__APP_VERSION__ = JSON.stringify(packageJson.version)
      }
    },

    devServer: {
      open: false,
      proxy: {
        '/api/github': {
          target: 'https://api.github.com',
          changeOrigin: true,
          rewrite: (path) => path.replace(/^\/api\/github/, ''),
          configure: (proxy) => {
            proxy.on('proxyReq', (proxyReq, req) => {
              proxyReq.setHeader('User-Agent', 'hackjutsu-lepton-app')
              if (req.headers.authorization) {
                proxyReq.setHeader('Authorization', req.headers.authorization)
              }
            })
          }
        }
      }
    },

    framework: {
      config: {},

      plugins: [
        'Notify',
        'Dialog',
        'Loading',
        'LocalStorage',
        'SessionStorage',
        'Meta',
        'Dark'
      ]
    },

    animations: 'all',

    ssr: {
      pwa: false,
      prodPort: 3000,
      middlewares: [
        'render'
      ]
    },

    pwa: {
      workboxMode: 'GenerateSW',
      injectPwaMetaTags: true,
      swFilename: 'sw.js',
      manifestFilename: 'manifest.json',
      useCredentialsForManifestTag: false,

      manifest: {
        name: 'Qepton',
        short_name: 'Qepton',
        description: 'Prompt and Code Snippet Manager powered by GitHub Gist',
        display: 'standalone',
        orientation: 'portrait',
        background_color: '#ffffff',
        theme_color: '#027be3',
        icons: [
          {
            src: 'icons/icon-128x128.png',
            sizes: '128x128',
            type: 'image/png'
          },
          {
            src: 'icons/icon-192x192.png',
            sizes: '192x192',
            type: 'image/png'
          },
          {
            src: 'icons/icon-256x256.png',
            sizes: '256x256',
            type: 'image/png'
          },
          {
            src: 'icons/icon-384x384.png',
            sizes: '384x384',
            type: 'image/png'
          },
          {
            src: 'icons/icon-512x512.png',
            sizes: '512x512',
            type: 'image/png'
          }
        ]
      },

      workboxOptions: {
        skipWaiting: true,
        clientsClaim: true,
        runtimeCaching: [
          {
            urlPattern: /^https:\/\/api\.github\.com\/.*/i,
            handler: 'NetworkFirst',
            options: {
              cacheName: 'github-api-cache',
              expiration: {
                maxEntries: 50,
                maxAgeSeconds: 60 * 60
              }
            }
          },
          {
            urlPattern: /^https:\/\/avatars\.githubusercontent\.com\/.*/i,
            handler: 'CacheFirst',
            options: {
              cacheName: 'github-avatars-cache',
              expiration: {
                maxEntries: 100,
                maxAgeSeconds: 60 * 60 * 24 * 7
              }
            }
          }
        ]
      }
    },

    cordova: {},

    capacitor: {
      hideSplashscreen: true
    },

    electron: {
      inspectPort: 5858,

      bundler: 'builder',

      builder: {
        appId: 'com.cosmox.qepton',
        productName: 'Qepton',
        copyright: 'Copyright © 2025 CosmoX',

        directories: {
          output: '../dist/electron'
        },

        mac: {
          category: 'public.app-category.productivity',
          icon: 'src-electron/icons/icon.icns',
          target: [
            { target: 'dmg', arch: ['x64', 'arm64'] },
            { target: '7z', arch: ['x64', 'arm64'] }
          ],
          darkModeSupport: true
        },

        win: {
          icon: 'src-electron/icons/icon.ico',
          target: [
            { target: 'nsis', arch: ['x64', 'ia32'] },
            { target: '7z', arch: ['x64', 'ia32'] }
          ]
        },

        nsis: {
          oneClick: false,
          allowToChangeInstallationDirectory: true
        },

        linux: {
          icon: 'src-electron/icons',
          category: 'Development',
          target: ['AppImage', 'deb', 'rpm'],
          executableName: 'qepton',
          desktop: {
            Name: 'Qepton',
            Icon: 'qepton',
            Comment: 'Prompt and Code Snippet Manager powered by GitHub Gist',
            Categories: 'Development;Utility;',
            StartupWMClass: 'Qepton'
          },
          synopsis: 'Prompt and Code Snippet Manager',
          description: 'A powerful code snippet manager that connects to GitHub Gist. Features include smart tagging, fuzzy search, syntax highlighting, and multi-platform support.',
          maintainer: 'whizBANG Developers'
        },

        snap: {
          confinement: 'strict',
          grade: 'stable',
          summary: 'Prompt and Code Snippet Manager powered by GitHub Gist',
          publish: null,  // Don't publish to Snap Store, only to GitHub Releases
          plugs: [
            'default',
            'desktop',
            'desktop-legacy',
            'home',
            'x11',
            'wayland',
            'unity7',
            'browser-support',
            'network',
            'network-bind',
            'password-manager-service'
          ]
        },

        deb: {
          depends: ['libgtk-3-0', 'libnotify4', 'libnss3', 'libxss1', 'libxtst6', 'xdg-utils', 'libatspi2.0-0', 'libuuid1', 'libsecret-1-0'],
          category: 'Development',
          priority: 'optional'
        },

        pacman: {
          depends: ['gtk3', 'libnotify', 'nss', 'libxss', 'libxtst', 'xdg-utils', 'at-spi2-core', 'util-linux-libs', 'libsecret']
        },

        rpm: {
          depends: ['gtk3', 'libnotify', 'nss', 'libXScrnSaver', 'libXtst', 'xdg-utils', 'at-spi2-core', 'libuuid', 'libsecret']
        },

        publish: [{
          provider: 'github',
          owner: 'whizbangdevelopers',
          repo: 'Qepton-Dev'
        }]
      }
    },

    bex: {
      contentScripts: [
        'my-content-script'
      ]
    }
  }
}
