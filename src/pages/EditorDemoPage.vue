<template>
  <q-page class="editor-demo-page q-pa-md">
    <div class="text-h4 q-mb-md">Code Editor Comparison</div>

    <div class="row q-col-gutter-md">
      <!-- Monaco Editor -->
      <div class="col-12 col-md-6">
        <q-card class="editor-card">
          <q-card-section class="bg-primary text-white">
            <div class="row items-center justify-between">
              <div>
                <div class="text-h6">Monaco Editor</div>
                <div class="text-caption">Powers VS Code (~5MB)</div>
              </div>
              <q-select
                v-model="monacoLanguage"
                :options="languageOptions"
                dense
                dark
                outlined
                emit-value
                map-options
                style="min-width: 120px"
              />
            </div>
          </q-card-section>
          <q-card-section class="q-pa-none">
            <vue-monaco-editor
              v-model:value="monacoCode"
              :language="monacoLanguage"
              :theme="isDark ? 'vs-dark' : 'vs'"
              :options="monacoOptions"
              style="height: 400px"
              @mount="handleMonacoMount"
            />
          </q-card-section>
          <q-card-section>
            <div class="text-caption text-grey">
              <strong>Pros:</strong> Full IDE features, IntelliSense, VS Code experience<br>
              <strong>Cons:</strong> Large bundle size (~5MB), requires worker setup
            </div>
          </q-card-section>
        </q-card>
      </div>

      <!-- CodeMirror Editor -->
      <div class="col-12 col-md-6">
        <q-card class="editor-card">
          <q-card-section class="bg-secondary text-white">
            <div class="row items-center justify-between">
              <div>
                <div class="text-h6">CodeMirror 6</div>
                <div class="text-caption">Modern & modular (~150KB)</div>
              </div>
              <q-select
                v-model="codemirrorLanguage"
                :options="languageOptions"
                dense
                dark
                outlined
                emit-value
                map-options
                style="min-width: 120px"
              />
            </div>
          </q-card-section>
          <q-card-section class="q-pa-none">
            <codemirror
              v-model="codemirrorCode"
              :style="{ height: '400px' }"
              :autofocus="false"
              :indent-with-tab="true"
              :tab-size="2"
              :extensions="codemirrorExtensions"
              @ready="handleCodemirrorReady"
            />
          </q-card-section>
          <q-card-section>
            <div class="text-caption text-grey">
              <strong>Pros:</strong> Lightweight, modular, modern ES6 architecture<br>
              <strong>Cons:</strong> Less IDE-like, manual language setup
            </div>
          </q-card-section>
        </q-card>
      </div>
    </div>

    <!-- Feature Comparison -->
    <q-card class="q-mt-md">
      <q-card-section>
        <div class="text-h6 q-mb-md">Feature Comparison</div>
        <q-markup-table flat bordered>
          <thead>
            <tr>
              <th>Feature</th>
              <th>Monaco</th>
              <th>CodeMirror 6</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>Bundle Size</td>
              <td class="text-negative">~5MB</td>
              <td class="text-positive">~150KB core</td>
            </tr>
            <tr>
              <td>Syntax Highlighting</td>
              <td class="text-positive">Excellent</td>
              <td class="text-positive">Excellent</td>
            </tr>
            <tr>
              <td>IntelliSense / Autocomplete</td>
              <td class="text-positive">Built-in (VS Code quality)</td>
              <td class="text-warning">Basic (addons available)</td>
            </tr>
            <tr>
              <td>Language Support</td>
              <td class="text-positive">70+ languages</td>
              <td class="text-positive">Many via packages</td>
            </tr>
            <tr>
              <td>Themes</td>
              <td class="text-positive">VS Code themes compatible</td>
              <td class="text-positive">Themeable (fewer presets)</td>
            </tr>
            <tr>
              <td>Mobile Support</td>
              <td class="text-warning">Limited</td>
              <td class="text-positive">Good</td>
            </tr>
            <tr>
              <td>Setup Complexity</td>
              <td class="text-warning">Needs worker config</td>
              <td class="text-positive">Simple import</td>
            </tr>
            <tr>
              <td>Vue 3 Integration</td>
              <td class="text-positive">Good (@guolao/vue-monaco-editor)</td>
              <td class="text-positive">Good (vue-codemirror)</td>
            </tr>
          </tbody>
        </q-markup-table>
      </q-card-section>
    </q-card>

    <!-- Load Time Stats -->
    <q-card class="q-mt-md">
      <q-card-section>
        <div class="text-h6 q-mb-sm">Load Performance</div>
        <div class="row q-col-gutter-md">
          <div class="col-6">
            <q-linear-progress
              :value="monacoLoaded ? 1 : 0"
              color="primary"
              class="q-mb-xs"
            />
            <div class="text-caption">
              Monaco: {{ monacoLoadTime ? `${monacoLoadTime}ms` : 'Loading...' }}
            </div>
          </div>
          <div class="col-6">
            <q-linear-progress
              :value="codemirrorLoaded ? 1 : 0"
              color="secondary"
              class="q-mb-xs"
            />
            <div class="text-caption">
              CodeMirror: {{ codemirrorLoadTime ? `${codemirrorLoadTime}ms` : 'Loading...' }}
            </div>
          </div>
        </div>
      </q-card-section>
    </q-card>

    <div class="q-mt-md text-center">
      <q-btn
        label="Back to Dashboard"
        color="primary"
        outline
        to="/"
      />
    </div>
  </q-page>
</template>

<script setup lang="ts">
import { ref, computed, shallowRef } from 'vue'
import { useQuasar } from 'quasar'
import { Codemirror } from 'vue-codemirror'
import { javascript } from '@codemirror/lang-javascript'
import { python } from '@codemirror/lang-python'
import { html } from '@codemirror/lang-html'
import { css } from '@codemirror/lang-css'
import { json } from '@codemirror/lang-json'
import { markdown } from '@codemirror/lang-markdown'
import { oneDark } from '@codemirror/theme-one-dark'
import VueMonacoEditor from '@guolao/vue-monaco-editor'

const $q = useQuasar()
const isDark = computed(() => $q.dark.isActive)

// Sample code for demo
const sampleCode = `// Welcome to the Code Editor Demo!
function fibonacci(n) {
  if (n <= 1) return n
  return fibonacci(n - 1) + fibonacci(n - 2)
}

// Calculate first 10 fibonacci numbers
const results = []
for (let i = 0; i < 10; i++) {
  results.push(fibonacci(i))
}

console.log('Fibonacci sequence:', results)
// Output: [0, 1, 1, 2, 3, 5, 8, 13, 21, 34]

export { fibonacci, results }
`

// Monaco state
const monacoCode = ref(sampleCode)
const monacoLanguage = ref('javascript')
const monacoLoaded = ref(false)
const monacoLoadTime = ref<number | null>(null)
const monacoStartTime = Date.now()

const monacoOptions = {
  minimap: { enabled: false },
  fontSize: 14,
  lineNumbers: 'on' as const,
  scrollBeyondLastLine: false,
  automaticLayout: true,
  tabSize: 2,
  wordWrap: 'on' as const,
}

function handleMonacoMount() {
  monacoLoaded.value = true
  monacoLoadTime.value = Date.now() - monacoStartTime
}

// CodeMirror state
const codemirrorCode = ref(sampleCode)
const codemirrorLanguage = ref('javascript')
const codemirrorLoaded = ref(false)
const codemirrorLoadTime = ref<number | null>(null)
const codemirrorStartTime = Date.now()
const codemirrorView = shallowRef()

const languageMap: Record<string, () => ReturnType<typeof javascript>> = {
  javascript: () => javascript({ jsx: true, typescript: true }),
  python: () => python(),
  html: () => html(),
  css: () => css(),
  json: () => json(),
  markdown: () => markdown(),
}

const codemirrorExtensions = computed(() => {
  const extensions = []
  const langFn = languageMap[codemirrorLanguage.value]
  if (langFn) {
    extensions.push(langFn())
  }
  if (isDark.value) {
    extensions.push(oneDark)
  }
  return extensions
})

function handleCodemirrorReady(payload: { view: unknown }) {
  codemirrorView.value = payload.view
  codemirrorLoaded.value = true
  codemirrorLoadTime.value = Date.now() - codemirrorStartTime
}

// Language options
const languageOptions = [
  { label: 'JavaScript', value: 'javascript' },
  { label: 'Python', value: 'python' },
  { label: 'HTML', value: 'html' },
  { label: 'CSS', value: 'css' },
  { label: 'JSON', value: 'json' },
  { label: 'Markdown', value: 'markdown' },
]
</script>

<style scoped lang="scss">
.editor-demo-page {
  max-width: 1400px;
  margin: 0 auto;
}

.editor-card {
  height: 100%;
}

:deep(.cm-editor) {
  height: 100%;
  font-size: 14px;
}

:deep(.cm-scroller) {
  overflow: auto;
}
</style>
