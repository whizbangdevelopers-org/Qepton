<template>
  <div class="code-editor" :class="{ 'read-only': readonly }">
    <Codemirror
      :model-value="modelValue"
      :style="{ height: height }"
      :autofocus="autofocus"
      :indent-with-tab="true"
      :tab-size="2"
      :extensions="extensions"
      :disabled="readonly"
      @ready="handleReady"
      @update:model-value="handleUpdate"
    />
  </div>
</template>

<script setup lang="ts">
import { computed, shallowRef } from 'vue'
import { Codemirror } from 'vue-codemirror'
import { EditorView } from '@codemirror/view'
import { oneDark } from '@codemirror/theme-one-dark'
import { useQuasar } from 'quasar'

import { javascript } from '@codemirror/lang-javascript'
import { python } from '@codemirror/lang-python'
import { java } from '@codemirror/lang-java'
import { json } from '@codemirror/lang-json'
import { html } from '@codemirror/lang-html'
import { css } from '@codemirror/lang-css'
import { markdown } from '@codemirror/lang-markdown'
import { sql } from '@codemirror/lang-sql'
import { yaml } from '@codemirror/lang-yaml'
import { go } from '@codemirror/lang-go'
import { rust } from '@codemirror/lang-rust'
import { cpp } from '@codemirror/lang-cpp'
import { php } from '@codemirror/lang-php'
import { vue } from '@codemirror/lang-vue'
import { xml } from '@codemirror/lang-xml'
import { less } from '@codemirror/lang-less'
import { angular } from '@codemirror/lang-angular'
import { liquid } from '@codemirror/lang-liquid'
import { wast } from '@codemirror/lang-wast'
import { nix } from '@replit/codemirror-lang-nix'
import { getLanguageFromFilename } from 'src/utils/languageDetection'

interface Props {
  modelValue: string
  language?: string
  filename?: string
  height?: string
  readonly?: boolean
  autofocus?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  modelValue: '',
  language: '',
  filename: '',
  height: '300px',
  readonly: false,
  autofocus: false
})

const emit = defineEmits<{
  'update:modelValue': [value: string]
}>()

const $q = useQuasar()
const view = shallowRef<EditorView>()

const detectedLanguage = computed(() => {
  if (props.language) return props.language.toLowerCase()
  if (props.filename) return getLanguageFromFilename(props.filename)
  return ''
})

function getLanguageExtension(lang: string) {
  switch (lang) {
    case 'javascript':
      return javascript()
    case 'typescript':
      return javascript({ typescript: true })
    case 'jsx':
      return javascript({ jsx: true })
    case 'tsx':
      return javascript({ typescript: true, jsx: true })
    case 'python':
      return python()
    case 'java':
      return java()
    case 'json':
      return json()
    case 'html':
      return html()
    case 'css':
    case 'scss':
    case 'sass':
      return css()
    case 'less':
      return less()
    case 'markdown':
      return markdown()
    case 'sql':
      return sql()
    case 'yaml':
      return yaml()
    case 'go':
      return go()
    case 'rust':
      return rust()
    case 'cpp':
      return cpp()
    case 'php':
      return php()
    case 'vue':
      return vue()
    case 'xml':
      return xml()
    case 'wast':
      return wast()
    case 'nix':
      return nix()
    case 'liquid':
      return liquid()
    case 'angular':
      return angular()
    default:
      return null
  }
}

const extensions = computed(() => {
  const exts = []
  
  if ($q.dark.isActive) {
    exts.push(oneDark)
  }
  
  const langExt = getLanguageExtension(detectedLanguage.value)
  if (langExt) {
    exts.push(langExt)
  }
  
  exts.push(EditorView.lineWrapping)
  
  if (props.readonly) {
    exts.push(EditorView.editable.of(false))
  }
  
  return exts
})

function handleReady(payload: { view: EditorView }) {
  view.value = payload.view
}

function handleUpdate(value: string) {
  emit('update:modelValue', value)
}
</script>

<style lang="scss" scoped>
.code-editor {
  border: 1px solid var(--border-color);
  border-radius: 4px;
  overflow: hidden;
  
  :deep(.cm-editor) {
    font-family: 'Fira Code', 'Consolas', 'Monaco', monospace;
    font-size: 14px;
  }
  
  :deep(.cm-focused) {
    outline: none;
  }
  
  :deep(.cm-scroller) {
    overflow: auto;
  }
  
  &.read-only {
    :deep(.cm-editor) {
      background: var(--bg-secondary);
    }
  }
}
</style>
