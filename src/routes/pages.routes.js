import express from 'express'
import { asyncRoute } from '../utils/httpHelper.js'
import { param, query, body } from 'express-validator'
import { requirePermission, requirePageAccess, requireLogin } from '../middlewares/permission.js'
import { chkCaptcha } from '../middlewares/chkCaptcha.js'
import { validateRequest } from '../middlewares/validation.js'
import viewController from '../controllers/pages/viewGet.js'
import previewController from '../controllers/pages/preview.js'
import searchGetController from '../controllers/pages/searchGet.js'
import searchPostController from '../controllers/pages/searchPost.js'
import rawGetController from '../controllers/pages/rawGet.js'
import historyGetController from '../controllers/pages/historyGet.js'
import diffGetController from '../controllers/pages/diffGet.js'
import pagelistGetController from '../controllers/pages/pagelistGet.js'
import categoryGetController from '../controllers/pages/categoryGet.js'
import viewrankGetController from '../controllers/pages/viewrankGet.js'
import xrefGetController from '../controllers/pages/xrefGet.js'
import editGetController from '../controllers/pages/editGet.js'
import editPostController from '../controllers/pages/editPost.js'
import moveGetController from '../controllers/pages/moveGet.js'
import deleteGetController from '../controllers/pages/deleteGet.js'
import revertGetController from '../controllers/pages/revertGet.js'
import revertPostController from '../controllers/pages/revertPost.js'
import movePostController from '../controllers/pages/movePost.js'
import deletePageController from '../controllers/pages/deletePost.js'
import purgeGetController from '../controllers/pages/purgeGet.js'
import purgePostController from '../controllers/pages/purgePost.js'


export default (options = {}) => {
    const router = express.Router()

    const csrfProtection = options.csrfProtection

    router.get('/w/:name(*)',
        param('name').trim().notEmpty(),
        query('rev').optional().isInt().toInt(),
        validateRequest,
        requirePageAccess('read', {
            noAclMessageKey: 'view_noacl',
            revisionQueryKeys: ['rev']
        }),
        asyncRoute(viewController)
    )

    router.post('/w', asyncRoute(async (req, res) => {
        res.json({ redirect: '/w/' + req.body.pagename })
    }))

    router.post('/preview',
        body('content').trim().notEmpty(),
        body('title').trim().notEmpty(),
        validateRequest,
        asyncRoute(previewController)
    )

    router.get('/recentchanges', asyncRoute(async (req, res) => {
        const changes = await req.app.locals.services.recentChanges.getRecentChanges({
            show: req.query ? req.query.show : undefined,
            isUnique: req.query && req.query.isunique === 'true',
            excludeFile: req.query && req.query.excludefile === 'true',
            editOnly: req.query && req.query.editonly === 'true'
        })

        res.json(changes)
    }))
    router.get('/autocomplete',
        asyncRoute(async (req, res) => {
            const query = req.query ? req.query.q : undefined
            if (!query) {
                res.json({})
                return
            }
            const results = await req.app.locals.services.search.autocompletePages(query, 10)
            res.json(results)
        }))

    router.get('/search',
        query('q').trim().notEmpty(),
        query('from').optional().isInt().toInt(),
        validateRequest,
        asyncRoute(searchGetController)
    )

    router.post('/search',
        body('pagename').trim().notEmpty(),
        validateRequest,
        asyncRoute(searchPostController)
    )

    router.get('/raw/:name(*)',
        param('name').trim().notEmpty(),
        query('rev').optional().isInt().toInt(),
        validateRequest,
        requirePageAccess('read', { noAclMessageKey: 'view_noacl' }),
        asyncRoute(rawGetController)
    )

    router.get('/history/:name(*)',
        param('name').trim().notEmpty(),
        query('from').optional().isInt().toInt(),
        query('to').optional().isInt().toInt(),
        validateRequest,
        requirePageAccess('read', { noAclMessageKey: 'view_noacl' }),
        asyncRoute(historyGetController)
    )

    router.get('/diff/:name(*)',
        query('rev1').isInt().toInt(),
        query('rev2').isInt().toInt(),
        validateRequest,
        requirePageAccess('read', {
            noAclMessageKey: 'view_noacl',
            revisionQueryKeys: ['rev1', 'rev2']
        }),
        asyncRoute(diffGetController)
    )

    router.get('/RecentChanges', asyncRoute(async (req, res) => {
        const changes = await req.app.locals.services.recentChanges.getRecentChanges({})
        res.json({ changes })
    }))

    router.get('/PageList', asyncRoute(pagelistGetController))

    router.get('/category/:name(*)', asyncRoute(categoryGetController))

    router.get('/viewrank', asyncRoute(viewrankGetController))

    router.get('/xref/:name(*)',
        param('name').trim().notEmpty(),
        validateRequest,
        asyncRoute(xrefGetController)
    )

    router.get('/RandomPage', asyncRoute(async (req, res) => {
        const randomPage = await req.app.locals.repositories.pages.getRandomPage()
        res.json({ redirect: `/w/${randomPage.title}` })
    }))

    router.get('/edit/:name(*)',
        csrfProtection,
        requirePageAccess('read', { noAclMessageKey: 'view_noacl' }), // We do this because not having edit access gives out the page's source code
        requirePageAccess('edit', {
            noAclMessageKey: 'edit_noacl',
            mode: 'store',
            storeKey: 'editAcl',
        }),
        param('name').trim().notEmpty(),
        param('name').trim().isLength({ max: 255 }),
        param('name').trim().matches(global.legalTitleRegex),
        validateRequest,
        asyncRoute(editGetController)
    )

    router.post('/edit/:name(*)',
        csrfProtection,
        chkCaptcha,
        requirePageAccess('edit', { noAclMessageKey: 'edit_noacl' }),
        asyncRoute(editPostController)
    )

    router.get('/move/:name(*)',
        csrfProtection,
        requirePageAccess('move', { noAclMessageKey: 'move_noacl' }),
        asyncRoute(moveGetController)
    )

    router.get('/delete/:name(*)',
        csrfProtection,
        requireLogin(),
        asyncRoute(deleteGetController)
    )

    router.get('/purge/:name(*)',
        csrfProtection,
        requirePermission('purgepage', { mode: 'enforce' }),
        asyncRoute(purgeGetController)
    )

    router.get('/revert/:name(*)',
        param('name').trim().notEmpty(),
        query('rev').isInt().toInt(),
        validateRequest,
        requirePageAccess('read', { noAclMessageKey: 'view_noacl' }),
        csrfProtection,
        asyncRoute(revertGetController)
    )

    router.post('/revert/:name(*)',
        param('name').trim().notEmpty(),
        body('rev').isInt().toInt(),
        validateRequest,
        csrfProtection,
        chkCaptcha,
        requirePageAccess('read', { noAclMessageKey: 'view_noacl' }),
        asyncRoute(revertPostController)
    )

    router.post('/move/:name(*)',
        csrfProtection,
        chkCaptcha,
        requirePageAccess('move', { noAclMessageKey: 'move_noacl' }),
        asyncRoute(movePostController)
    )

    router.post('/delete/:name(*)',
        param('name').trim().notEmpty(),
        validateRequest,
        csrfProtection,
        chkCaptcha,
        requireLogin(),
        asyncRoute(deletePageController)
    )

    router.post('/purge/:name(*)',
        param('name').trim().notEmpty(),
        validateRequest,
        csrfProtection,
        chkCaptcha,
        requirePermission('purgepage', { mode: 'enforce' }),
        asyncRoute(purgePostController)
    )

    return router
}
