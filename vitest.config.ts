import { defineConfig } from 'vitest/config'
import vue from '@vitejs/plugin-vue'
import { resolve } from 'path'

export default defineConfig({
  plugins: [vue()],
  test: {
    globals: true,
    environment: 'jsdom',
    include: ['tests/unit/**/*.spec.ts'],
    exclude: ['tests/e2e/**/*'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      reportsDirectory: './coverage',
      include: ['src/**/*.ts', 'src/**/*.vue'],
      exclude: [
        'src/**/*.d.ts',
        'src/types/**/*',
        'src/boot/**/*'
      ]
    },
    deps: {
      inline: ['quasar']
    }
  },
  resolve: {
    alias: {
      src: resolve(__dirname, './src'),
      app: resolve(__dirname, './'),
      components: resolve(__dirname, './src/components'),
      layouts: resolve(__dirname, './src/layouts'),
      pages: resolve(__dirname, './src/pages'),
      stores: resolve(__dirname, './src/stores'),
      services: resolve(__dirname, './src/services')
    }
  }
})
