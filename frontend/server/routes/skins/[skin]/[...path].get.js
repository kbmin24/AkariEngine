import { createReadStream } from 'node:fs'
import { stat } from 'node:fs/promises'
import { extname, resolve, sep } from 'node:path'

const contentTypes = {
    '.css': 'text/css; charset=utf-8',
    '.js': 'text/javascript; charset=utf-8',
    '.json': 'application/json; charset=utf-8',
    '.png': 'image/png',
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.gif': 'image/gif',
    '.svg': 'image/svg+xml',
    '.webp': 'image/webp',
    '.woff': 'font/woff',
    '.woff2': 'font/woff2',
    '.ttf': 'font/ttf',
}

export default defineEventHandler(async (event) => {
    const config = useRuntimeConfig()
    const skin = getRouterParam(event, 'skin') || ''
    const path = getRouterParam(event, 'path') || ''

    if (!/^[A-Za-z0-9_-]+$/.test(skin) || path.includes('\0')) {
        throw createError({ statusCode: 404 })
    }

    const publicRoot = resolve(config.skinAssetsRoot, skin, 'public')
    const filePath = resolve(publicRoot, path)

    if (filePath !== publicRoot && !filePath.startsWith(`${publicRoot}${sep}`)) {
        throw createError({ statusCode: 404 })
    }

    const fileStat = await stat(filePath).catch(() => null)
    if (!fileStat?.isFile()) {
        throw createError({ statusCode: 404 })
    }

    setHeader(event, 'Content-Type', contentTypes[extname(filePath).toLowerCase()] || 'application/octet-stream')
    return sendStream(event, createReadStream(filePath))
})
