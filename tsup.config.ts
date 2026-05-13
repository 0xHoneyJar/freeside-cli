import { defineConfig } from 'tsup'

export default defineConfig({
  entry: ['src/bin/freeside.ts'],
  outDir: 'dist/bin',
  format: ['esm'],
  target: 'node20',
  platform: 'node',
  splitting: false,
  sourcemap: true,
  clean: true,
  minify: false,
  dts: false,
})
