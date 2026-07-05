import express from 'express'
import { query } from 'express-validator'
import fs from 'node:fs'

import { validateRequest } from '../middlewares/validation.js'
import { asyncRoute } from '../utils/httpHelper.js'
import paths from '../utils/paths.js'

const packageJson = JSON.parse(fs.readFileSync(paths.resolve('package.json'), 'utf8'))

// patch version really exists to make npm happy
const appVersion = packageJson.version.replace(/^(\d+\.\d+)\.\d+/, '$1')

const normalizeInstalledPackage = item => ({
    name: item?.name ?? '',
    manifest: {
        name: item?.manifest?.name ?? item?.name ?? '',
        version: item?.manifest?.version ?? '',
        description: item?.manifest?.description ?? '',
        author: item?.manifest?.author ?? '',
        licence: item?.manifest?.licence ?? item?.manifest?.license ?? '',
        license: item?.manifest?.license ?? item?.manifest?.licence ?? '',
        homepage: item?.manifest?.homepage ?? '',
    },
})

export default () => {
    const router = express.Router()

    router.get('/Licence', (req, res) => {
        const extensions = Object.entries(global.extensions ?? {}).map(([name, extension]) => normalizeInstalledPackage({
            name,
            manifest: extension.manifest,
        }))

        res.json({
            page: 'licence',
            app: {
                name: 'AkariEngine',
                version: appVersion,
                copyright: 'Copyright Kyubin Min 2021-2026.',
                sourceUrl: 'https://github.com/kbmin24/AkariEngine',
                license: {
                    name: 'GNU Affero General Public License',
                    version: '3.0',
                    spdx: 'AGPL-3.0-or-later',
                    url: 'https://www.gnu.org/licenses/',
                },
            },
            skins: [],
            extensions,
        })
    })

    router.get('/noEmail', (req, res) => {
        res.json({})
    })

    router.get('/orphaned',
        query('from').optional().isInt().toInt({ min: 0 }).default(0),
        validateRequest,
        asyncRoute(async (req, res) => {
            const from = req.query.from
            const { pages, count } = await req.app.locals.services.page.getOrphanedPagesAndCount?.(from) || { pages: [], count: 0 }
            res.json({ pages, count })
        }))

    return router
}
