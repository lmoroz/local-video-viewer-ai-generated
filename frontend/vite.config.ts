import { fileURLToPath, URL } from 'node:url'
import { resolve } from 'node:path'
import { defineConfig, loadEnv, type UserConfig, type ConfigEnv } from 'vite'
import vue from '@vitejs/plugin-vue'
import Components from 'unplugin-vue-components/vite'
import { BootstrapVueNextResolver } from 'bootstrap-vue-next/resolvers'

export default (env: ConfigEnv): UserConfig => {
  process.env = { ...loadEnv(env.mode, resolve(process.cwd(), './env')) }

  return defineConfig({
    base: process.env.VITE_BASE_URL,
    envDir: resolve(process.cwd(), './env'),
    plugins: [
      vue(),
      Components({
        resolvers: [BootstrapVueNextResolver()],
        dirs: ['src'],
        deep: true,
      }),
    ],
    resolve: {
      alias: {
        '@': fileURLToPath(new URL('./src', import.meta.url)),
      },
    },
    build: {
      sourcemap: false,
    },
    server: {
      port: 5174,
    },
  })
}
