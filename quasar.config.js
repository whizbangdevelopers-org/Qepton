/* eslint-env node */

// Configuration for Quasar app
// https://v2.quasar.dev/quasar-cli-vite/quasar-config-js

import { getCompatibleVersions } from 'baseline-browser-mapping'
import { readFileSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { deriveViteAliases } from './quasar.aliases.js'

// app-vite 3 loads only quasar.config.js (ESM) or .ts; the .cjs form is not recognised
// at all and is reported as "not a Quasar project folder".
const __dirname = dirname(fileURLToPath(import.meta.url))

// Read package.json version
const packageJson = JSON.parse(readFileSync(join(__dirname, 'package.json'), 'utf-8'))


// ── Browser targets, DERIVED from Baseline "Widely available" — never hand-written ────────────
//
// This replaced `['es2022', 'chrome90', 'firefox88', 'safari14']` — April–September 2021, five
// years stale. It still BUILT here, which is exactly why it survived: the same list broke the
// template and Gantry outright (esbuild reads a mixed language-level + browser list as "satisfy
// ALL", so es2022 syntax had to be downlevelled for chrome90 and it refuses), and Qepton escaped
// only because its SPA build does not pull in the workbox code that tripped it. A floor nobody
// owns is a countdown, not a constant.
//
// PINNED, deliberately. An unpinned rolling window would make two builds of one commit produce
// different output as the wall clock advances. Moving the floor is a one-line change to this date.
const BASELINE_WIDELY_AVAILABLE_ON = '2026-08-01'

// esbuild target names differ from Baseline's browser ids. chrome_android / firefox_android have
// no distinct esbuild target and are covered by their desktop engines, so dropping them narrows
// nothing.
const ESBUILD_TARGET_NAME = {
  chrome: 'chrome',
  edge: 'edge',
  firefox: 'firefox',
  safari: 'safari',
  safari_ios: 'ios'
}

const BASELINE_VERSIONS = getCompatibleVersions({
  widelyAvailableOnDate: BASELINE_WIDELY_AVAILABLE_ON,
  includeDownstreamBrowsers: false
})

const BASELINE_TARGETS = BASELINE_VERSIONS.filter((b) => ESBUILD_TARGET_NAME[b.browser])
  .map((b) => `${ESBUILD_TARGET_NAME[b.browser]}${b.version}`)
  .sort()

// Reachable and load-bearing: if upstream renames a browser id the filter silently drops it, and
// enough renames drop everything. An empty target list does NOT fail — esbuild reads it as "no
// constraints" and emits whatever syntax it likes, so the floor disappears with no error and no
// diff. Refuse rather than absorb a condition that changes the answer.
if (BASELINE_TARGETS.length === 0) {
  throw new Error(
    `quasar.config.js: Baseline returned ${BASELINE_VERSIONS.length} browser(s) but ` +
      `ESBUILD_TARGET_NAME matched none of them (saw: ` +
      `${[...new Set(BASELINE_VERSIONS.map((b) => b.browser))].join(', ')}). ` +
      'Upstream browser ids have changed. Refusing to build with an unconstrained target.'
  )
}

// ── Node target, DERIVED from engines.node — also never hand-written ──────────────────────────
//
// It was `'node20'`, hand-written, while package.json declares `engines.node >= 24`. A target
// BELOW the engines floor merely forgoes newer syntax; a target ABOVE it is a latent break, since
// `engines` is a promise npm enforces and the target is a licence to emit. Either way the floor
// is the source and the target follows it, rather than being a second number to keep in step.
const ENGINES_NODE = packageJson.engines && packageJson.engines.node
const NODE_MAJOR = ENGINES_NODE && String(ENGINES_NODE).match(/(\d+)/)
if (!NODE_MAJOR) {
  throw new Error(
    'quasar.config.js: cannot derive the esbuild node target — package.json has no parseable ' +
      '`engines.node`. Declare the supported floor there rather than hard-coding a target here.'
  )
}
const NODE_TARGET = `node${NODE_MAJOR[1]}`

// ── Vite aliases, DERIVED from tsconfig paths ───────────────────────────────────────────────
//
// @quasar/app-vite 2 shipped `src`, `app`, `components`, `layouts`, `pages`, `assets`, `boot`
// and `stores` as built-in aliases. v3 ships only `@` and `#q-app`, so without this the dev
// server resolves none of them and the app does not mount — invisible to typecheck AND to the
// production build, both of which read tsconfig's own copy of the same map. Deriving it is what
// makes the two impossible to disagree. See scripts/lib/tsconfig-aliases.js, and
// audit:vite-aliases, which loads this file and checks what it actually hands Quasar.
const BUILD_ALIAS = deriveViteAliases(__dirname)

export default function (ctx) {
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
        // Both derived — see the block above the module export.
        browser: BASELINE_TARGETS,
        node: NODE_TARGET
      },

      vueRouterMode: 'hash', // available values: 'hash', 'history'

      // Set base path for GitHub Pages deployment
      publicPath: ctx.mode.pwa ? '/Qepton/' : '/',

      // Generated above from tsconfig paths — app-vite 3 dropped the built-in
      // `src`/`stores`/`layouts`/… aliases and provides only `@` and `#q-app`.
      alias: BUILD_ALIAS,

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
        appId: 'com.whizbangdevelopers.qepton',
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
            { target: 'msi', arch: ['x64'] },
            { target: 'portable', arch: ['x64'] },
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
          repo: 'Qepton-Dev',
          releaseType: 'release'
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
