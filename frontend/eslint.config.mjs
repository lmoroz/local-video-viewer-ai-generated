import pluginVue from 'eslint-plugin-vue'
import skipFormatting from '@vue/eslint-config-prettier/skip-formatting'
import { defineConfigWithVueTs } from '@vue/eslint-config-typescript'

export default defineConfigWithVueTs([
  {
    name: 'app/files-to-lint',
    files: ['**/*.{js,mjs,jsx,vue}']
  },

  {
    name: 'app/files-to-ignore',
    ignores: ['**/dist/**', '**/dist-ssr/**', '**/coverage/**', '**/shared/api/openapi/**']
  },

  pluginVue.configs['flat/essential'],

  skipFormatting,

  {
    rules: {
      'vue/multi-word-component-names': 'off',
      'vue/html-self-closing': [
        'error',
        {
          html: {
            void: 'always',
            normal: 'always',
            component: 'always'
          }
        }
      ],
      'vue/padding-line-between-blocks': ['error', 'always'],
      'vue/html-indent': ['error', 2]
    }
  }
])
