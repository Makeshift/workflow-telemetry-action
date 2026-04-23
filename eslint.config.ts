import config from '@makeshift27015/eslint-config'
import { dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

export default config({
  tsconfigRootDir: dirname(fileURLToPath(import.meta.url)),
  ignores: [
    'dist/**'
  ],
})
