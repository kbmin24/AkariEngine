import express from 'express'
import { asyncRoute, renderTemplateInLayout } from '../utils/httpHelper.js'
import { param, query, body } from 'express-validator'
import { requirePermission } from '../middlewares/permission.js'
import { chkCaptcha } from '../middlewares/chkCaptcha.js'
import { validateRequest } from '../middlewares/validation.js'
import { requirePageAccess } from '../middlewares/permission.js'
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


export default (services, options = {}) => {
    const router = express.Router()

    const csrfProtection = options.csrfProtection

    router.get('/w/:name(*)',
        param('name').trim().notEmpty(),
        query('rev').optional().isInt(),
        validateRequest,
        requirePageAccess('read', {
            noAclMessageKey: 'view_noacl',
            revisionQueryKeys: ['rev']
        }),
        asyncRoute(viewController)
    )

    router.post('/w', asyncRoute(async (req, res) => {
        await res.redirect('/w/' + req.body.pagename)
    }))

    router.post('/preview',
        body('content').trim().notEmpty(),
        body('title').trim().notEmpty(),
        validateRequest,
        asyncRoute(previewController)
    )

    router.get('/search',
        query('q').trim().notEmpty(),
        query('from').optional().isInt(),
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
        query('rev').optional().isInt(),
        validateRequest,
        requirePageAccess('read', { noAclMessageKey: 'view_noacl' }),
        asyncRoute(rawGetController)
    )

    router.get('/history/:name(*)',
        param('name').trim().notEmpty(),
        query('from').optional().isInt(),
        query('to').optional().isInt(),
        validateRequest,
        requirePageAccess('read', { noAclMessageKey: 'view_noacl' }),
        asyncRoute(historyGetController)
    )

    router.get('/diff/:name(*)',
        query('rev1').isInt(),
        query('rev2').isInt(),
        validateRequest,
        requirePageAccess('read', {
            noAclMessageKey: 'view_noacl',
            revisionQueryKeys: ['rev1', 'rev2']
        }),
        asyncRoute(diffGetController)
    )

    router.get('/RecentChanges', asyncRoute(async (req, res) => {
        await renderTemplateInLayout(req, res, 'pages/recentchanges.ejs', { l: res.__ }, {
            title: res.__('recentChanges'),
            isPage: false,
            username: req.session.username,
            ipaddr: req.ipAddress
        })
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
        // meh it's too thin, let's just leave it as is...
        const randomPage = await req.app.locals.repositories.pages.getRandomPage()
        res.redirect(`/w/${randomPage.title}`)
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
        requirePermission('deletepage', { mode: 'enforce' }),
        asyncRoute(deleteGetController)
    )

    router.get('/revert/:name(*)',
        param('name').trim().notEmpty(),
        query('rev').isInt(),
        validateRequest,
        requirePageAccess('read', { noAclMessageKey: 'view_noacl' }),
        csrfProtection,
        asyncRoute(revertGetController)
    )

    router.post('/revert/:name(*)',
        param('name').trim().notEmpty(),
        body('rev').isInt(),
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
        requirePermission('deletepage', { mode: 'enforce' }),
        asyncRoute(deletePageController)
    )

    return router
}
