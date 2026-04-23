import * as path from 'path'

await Bun.build({
  entrypoints: ['main.ts', 'post.ts', 'statCollector.ts', 'statCollectorWorker.ts'].map(f => path.join('src', f)),
  outdir: 'dist',
  target: 'node',
  sourcemap: 'inline',
  splitting: true,
})
