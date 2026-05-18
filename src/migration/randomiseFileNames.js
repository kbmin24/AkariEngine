// Migrates from old file names (i.e. file name on disk and DB sync'd) to random file names.
// Steps:
// 1. Use DBMS to add 'filenameOnDisk' STRING column right after filename
// 2. Run this script to populate columns and rename files
// 3. uncomment lines 14 and 16 in file.model.js and use DBMS to add NN and U flag
// 4. move public/uploads to uploads/

import { createSequelizeInstance } from '../config/database.js'
import fileModelFactory from '../models/file.model.js'
import pageModelFactory from '../models/page.model.js'
import historyModelFactory from '../models/history.model.js'
import path from 'node:path'
import fs from 'node:fs/promises'
import crypto from 'node:crypto'
import { fileURLToPath } from 'node:url'
import readline from 'node:readline/promises'
import { Op } from 'sequelize'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const uploadsDir = path.resolve(__dirname, '../../public/uploads')

const sequelize = createSequelizeInstance()
const FileModel = fileModelFactory(sequelize)
const PageModel = pageModelFactory(sequelize)
const HistoryModel = historyModelFactory(sequelize)

await sequelize.authenticate()
console.log('Database connection established.')

const files = await FileModel.findAll({ where: { filenameOnDisk: null } })
console.log(`Found ${files.length} unmigrated file(s).`)

let succeeded = 0
let failed = 0

for (const file of files) {
  const ext = path.extname(file.filename)
  const randomName = crypto.randomUUID() + ext
  const oldPath = path.join(uploadsDir, file.filename)
  const newPath = path.join(uploadsDir, randomName)

  try {
    await fs.rename(oldPath, newPath)
    await file.update({ filenameOnDisk: randomName })
    console.log(`  OK  "${file.filename}" → "${randomName}"`)
    succeeded++
  } catch (err) {
    console.error(`  FAIL "${file.filename}": ${err.message}`)
    failed++
  }
}

console.log(`\nMigration done. ${succeeded} migrated, ${failed} failed.`)

// --- Orphan cleanup ---

const FILE_PREFIX = 'File:'

// Case 1: File: pages with no corresponding record in the files table
const filePages = await PageModel.findAll({
  where: { title: { [Op.like]: 'File:%' } }
})
const allFiles = await FileModel.findAll({ attributes: ['filename'] })
const fileSet = new Set(allFiles.map(f => f.filename))
const orphanPages = filePages.filter(p => !fileSet.has(p.title.slice(FILE_PREFIX.length)))

// Case 2: file records whose filenameOnDisk is still null (rename failed during migration)
const nullFiles = await FileModel.findAll({ where: { filenameOnDisk: null } })

if (orphanPages.length === 0 && nullFiles.length === 0) {
  console.log('\nNo orphans found.')
  await sequelize.close()
  process.exit(0)
}

if (orphanPages.length > 0) {
  console.log(`\nOrphaned file pages (page exists, no file record) — ${orphanPages.length}:`)
  for (const p of orphanPages) console.log(`  - ${p.title}`)
}

if (nullFiles.length > 0) {
  console.log(`\nFailed migrations (file record has no disk name) — ${nullFiles.length}:`)
  for (const f of nullFiles) console.log(`  - ${f.filename}`)
}

const rl = readline.createInterface({ input: process.stdin, output: process.stdout })
const answer = await rl.question('\nDelete all of the above and their histories? [y/N] ')
rl.close()

if (answer.trim().toLowerCase() !== 'y') {
  console.log('Aborted.')
  await sequelize.close()
  process.exit(0)
}

for (const page of orphanPages) {
  await HistoryModel.destroy({ where: { page: page.title } })
  await page.destroy()
  console.log(`  Deleted page: ${page.title}`)
}

for (const file of nullFiles) {
  const pageTitle = FILE_PREFIX + file.filename
  await HistoryModel.destroy({ where: { page: pageTitle } })
  await PageModel.destroy({ where: { title: pageTitle } })
  await file.destroy()
  console.log(`  Deleted file record: ${file.filename}`)
}

console.log('Orphan cleanup done.')
await sequelize.close()
