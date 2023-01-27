import { defineConfig } from 'tsup'
import { getConfig } from '../../scripts/tsup'
import { dependencies } from './package.json'

const entry = 'src/index.ts'

export default defineConfig(
  getConfig({
    dev: process.env.DEV === 'true',
    entry: [entry],
    external: [...Object.keys(dependencies)],
    platform: 'node',
    sourcemap: true
  })
)
