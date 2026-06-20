import { defineConfig } from 'vite';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import UniPlugin from '@dcloudio/vite-plugin-uni';

const __dirname = dirname(fileURLToPath(import.meta.url));

const uni = (typeof UniPlugin === 'function'
  ? UniPlugin
  : (UniPlugin as { default: () => unknown }).default) as () => unknown;

// 强制 @vue/* 解析到项目内 vue@3.4.21 附带的版本，
// 避免被 home 目录下全局 node_modules 中的 Vue 3.5 干扰
const vuePkgs = [
  'runtime-core', 'runtime-dom', 'shared', 'reactivity',
  'compiler-core', 'compiler-dom', 'compiler-sfc', 'compiler-ssr',
];
const vueAliases: Record<string, string> = {};
for (const pkg of vuePkgs) {
  vueAliases[`@vue/${pkg}`] = resolve(
    __dirname,
    `../../node_modules/.pnpm/@vue+${pkg}@3.4.21/node_modules/@vue/${pkg}`,
  );
}

export default defineConfig({
  plugins: [uni()],
  publicDir: resolve(__dirname, 'public'),
  resolve: {
    alias: vueAliases,
  },
});
