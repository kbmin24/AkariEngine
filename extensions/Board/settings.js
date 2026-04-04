import { readFileSync } from 'fs'
import { fileURLToPath } from 'url'
import { join, dirname } from 'path'

const __dirname = dirname(fileURLToPath(import.meta.url))

let settings

try {
  settings = JSON.parse(readFileSync(join(__dirname, 'LocalSettings.json'), 'utf-8'))
} catch (e) {
  if (e.code === 'ENOENT') {
    throw new Error('Board extension: LocalSettings.json not found. Copy LocalSettings_Example.json to LocalSettings.json and configure it.')
  }
  throw e
}

export default settings
