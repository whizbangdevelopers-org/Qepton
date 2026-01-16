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
import { sass } from '@codemirror/lang-sass'
import { nix } from '@replit/codemirror-lang-nix'
import { StreamLanguage } from '@codemirror/language'
import { shell } from '@codemirror/legacy-modes/mode/shell'
import { ruby } from '@codemirror/legacy-modes/mode/ruby'
import { swift } from '@codemirror/legacy-modes/mode/swift'
import { kotlin, scala, csharp, dart } from '@codemirror/legacy-modes/mode/clike'
import { r } from '@codemirror/legacy-modes/mode/r'
import { lua } from '@codemirror/legacy-modes/mode/lua'
import { perl } from '@codemirror/legacy-modes/mode/perl'
import { haskell } from '@codemirror/legacy-modes/mode/haskell'
import { erlang } from '@codemirror/legacy-modes/mode/erlang'
import { clojure } from '@codemirror/legacy-modes/mode/clojure'
import { groovy } from '@codemirror/legacy-modes/mode/groovy'
import { powerShell } from '@codemirror/legacy-modes/mode/powershell'
import { dockerFile } from '@codemirror/legacy-modes/mode/dockerfile'
import { toml } from '@codemirror/legacy-modes/mode/toml'
import { commonLisp } from '@codemirror/legacy-modes/mode/commonlisp'
import { scheme } from '@codemirror/legacy-modes/mode/scheme'
import { fortran } from '@codemirror/legacy-modes/mode/fortran'
import { cobol } from '@codemirror/legacy-modes/mode/cobol'
import { pascal } from '@codemirror/legacy-modes/mode/pascal'
import { diff } from '@codemirror/legacy-modes/mode/diff'
import { protobuf } from '@codemirror/legacy-modes/mode/protobuf'
import { nginx } from '@codemirror/legacy-modes/mode/nginx'
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
      return css()
    case 'scss':
    case 'sass':
      return sass()
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
    case 'shell':
    case 'bash':
      return StreamLanguage.define(shell)
    case 'ruby':
      return StreamLanguage.define(ruby)
    case 'swift':
      return StreamLanguage.define(swift)
    case 'kotlin':
      return StreamLanguage.define(kotlin)
    case 'scala':
      return StreamLanguage.define(scala)
    case 'r':
      return StreamLanguage.define(r)
    case 'lua':
      return StreamLanguage.define(lua)
    case 'perl':
      return StreamLanguage.define(perl)
    case 'haskell':
      return StreamLanguage.define(haskell)
    case 'erlang':
      return StreamLanguage.define(erlang)
    case 'clojure':
      return StreamLanguage.define(clojure)
    case 'groovy':
      return StreamLanguage.define(groovy)
    case 'powershell':
      return StreamLanguage.define(powerShell)
    case 'dockerfile':
      return StreamLanguage.define(dockerFile)
    case 'toml':
      return StreamLanguage.define(toml)
    case 'lisp':
      return StreamLanguage.define(commonLisp)
    case 'scheme':
      return StreamLanguage.define(scheme)
    case 'fortran':
      return StreamLanguage.define(fortran)
    case 'cobol':
      return StreamLanguage.define(cobol)
    case 'pascal':
      return StreamLanguage.define(pascal)
    case 'diff':
      return StreamLanguage.define(diff)
    case 'protobuf':
      return StreamLanguage.define(protobuf)
    case 'nginx':
      return StreamLanguage.define(nginx)
    case 'csharp':
      return StreamLanguage.define(csharp)
    case 'dart':
      return StreamLanguage.define(dart)
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
