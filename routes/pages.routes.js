import express from 'express'
import i18n from 'i18n'
import { asyncRoute, renderTemplateInLayout, BACK_LINK, LOGIN_LINK } from '../utils/httpHelper.js'
import { param, query, body } from 'express-validator'
import { requirePermission } from '../middlewares/permission.js'
import { chkCaptcha } from '../middlewares/chkCaptcha.js'
import { validateRequest } from '../middlewares/validation.js'
import { requirePageAccess } from '../middlewares/permission.js'
import viewHandler from '../pages/view.js'
import previewController from '../controllers/pages/preview.js'
import searchGetController from '../controllers/pages/searchGet.js'
import searchPostController from '../controllers/pages/searchPost.js'
import rawGetController from '../controllers/pages/rawGet.js'
import historyGetController from '../controllers/pages/historyGet.js'
import diffGetController from '../controllers/pages/diffGet.js'
import pageListPage from '../pages/pagelist.js'
import categoryPage from '../pages/category.js'
import viewRankPage from '../pages/viewrank.js'
import xrefGetController from '../controllers/pages/xrefGet.js'
import editGetController from '../controllers/pages/editGet.js'
import editPostController from '../controllers/pages/editPost.js'
import moveGetController from '../controllers/pages/moveGet.js'
import deleteGetController from '../controllers/pages/deleteGet.js'
import revertGetPage from '../controllers/pages/revertGet.js'
import revertPage from '../pages/revert.js'
import movePostController from '../controllers/pages/movePost.js'
import deletePageController from '../controllers/pages/deletePost.js'

function accessOptions(noAclMessageKey, extra = {}) {
    return {
        noAclMessageKey,
        permissionReturnLink: BACK_LINK,
        permissionReturnName: 'previousPage',
        authReturnLink: LOGIN_LINK,
        authReturnName: 'loginpage',
        ...extra
    }
}

export default (services, options = {}) => {
    const router = express.Router()

    const csrfProtection = options.csrfProtection

    router.get('/w/:name(*)',
        param('name').trim().notEmpty(),
        query('rev').optional().isInt(),
        validateRequest,
        requirePageAccess('read', accessOptions('view_noacl', {
            revisionQueryKeys: ['rev']
        })),
        asyncRoute(async (req, res) => {
            await viewHandler(req, res)
        })
    )

    router.post('/w', asyncRoute(async (req, res) => {
        await res.redirect('/w/' + req.body.pagename)
    }))

    router.post('/preview',
        body('content').trim().notEmpty(),
        body('title').trim().notEmpty(),
        validateRequest,
        asyncRoute(async (req, res) => {
            await previewController(req, res)
        }))

    router.get('/search',
        query('q').trim().notEmpty(),
        query('from').optional().isInt(),
        validateRequest,
        asyncRoute(async (req, res) => {
            await searchGetController(req, res)
        }))

    router.post('/search',
        body('pagename').trim().notEmpty(),
        validateRequest,
        asyncRoute(async (req, res) => {
            await searchPostController(req, res)
        }))

    router.get('/raw/:name(*)',
        param('name').trim().notEmpty(),
        query('rev').optional().isInt(),
        validateRequest,
        requirePageAccess('read', accessOptions('view_noacl')),
        asyncRoute(async (req, res) => {
            await rawGetController(req, res)
        })
    )

    router.get('/history/:name(*)',
        param('name').trim().notEmpty(),
        query('from').optional().isInt(),
        query('to').optional().isInt(),
        validateRequest,
        requirePageAccess('read', accessOptions('view_noacl')),
        asyncRoute(async (req, res) => {
            await historyGetController(req, res)
        })
    )

    router.get('/diff/:name(*)',
        query('rev1').isInt(),
        query('rev2').isInt(),
        validateRequest,
        requirePageAccess('read', accessOptions('view_noacl', {
            revisionQueryKeys: ['rev1', 'rev2']
        })),
        asyncRoute(async (req, res) => {
            await diffGetController(req, res)
        }))

    router.get('/RecentChanges', asyncRoute(async (req, res) => {
        await renderTemplateInLayout(req, res, 'pages/recentchanges.ejs', { l: i18n.__ }, {
            title: i18n.__('recentChanges'),
            isPage: false,
            username: req.session.username,
            ipaddr: req.ipAddress
        })
    }))

    router.get('/PageList', asyncRoute(async (req, res) => {
        await pageListPage(req, res, global.db.pages)
    }))

    router.get('/category/:name(*)', asyncRoute(async (req, res) => {
        await categoryPage(req, res, global.db.category)
    }))

    router.get('/viewrank', asyncRoute(async (req, res) => {
        await viewRankPage(req, res, global.db.viewcount)
    }))

    router.get('/xref/:name(*)',
        param('name').trim().notEmpty(),
        validateRequest,
        asyncRoute(async (req, res) => {
            await xrefGetController(req, res)
        }))

    router.get('/RandomPage', asyncRoute(async (req, res) => {
        // meh it's too thin, let's just leave it as is...
        const randomPage = await req.app.locals.repositories.pages.getRandomPage()
        res.redirect(`/w/${randomPage.title}`)
    }))

    router.get('/edit/:name(*)',
        csrfProtection,
        requirePageAccess('read', accessOptions('view_noacl')), // We do this because not having edit access gives out the page's source code
        requirePageAccess('edit', accessOptions('edit_noacl', {
            mode: 'store',
            storeKey: 'editAcl',
        })),
        param('name').trim().notEmpty(),
        param('name').trim().isLength({ max: 255 }),
        param('name').trim().matches(global.legalTitleRegex),
        validateRequest,
        asyncRoute(async (req, res) => {
            await editGetController(req, res)
        })
    )

    router.post('/edit/:name(*)',
        csrfProtection,
        chkCaptcha,
        requirePageAccess('edit', accessOptions('edit_noacl')),
        asyncRoute(async (req, res) => {
            await editPostController(req, res)
        })
    )

    router.get('/move/:name(*)',
        csrfProtection,
        requirePageAccess('move', accessOptions('move_noacl')),
        asyncRoute(async (req, res) => {
            await moveGetController(req, res)
        })
    )

    router.get('/delete/:name(*)',
        csrfProtection,
        requirePermission('deletepage', {
            mode: 'enforce'
        }),
        asyncRoute(async (req, res) => {
            await deleteGetController(req, res)
        })
    )

    router.get('/revert/:name(*)',
        param('name').trim().notEmpty(),
        query('rev').isInt(),
        validateRequest,
        requirePageAccess('read', accessOptions('view_noacl')),
        csrfProtection,
        asyncRoute(async (req, res) => {
            await revertGetPage(req, res)
        })
    )

    router.post('/revert/:name(*)',
        param('name').trim().notEmpty(),
        body('rev').isInt(),
        validateRequest,
        csrfProtection,
        chkCaptcha,
        requirePageAccess('read', accessOptions('view_noacl')),
        asyncRoute(async (req, res) => {
            await revertPage(req, res)
        })
    )

    router.post('/move/:name(*)',
        csrfProtection,
        chkCaptcha,
        requirePageAccess('move', accessOptions('move_noacl')),
        asyncRoute(async (req, res) => {
            await movePostController(req, res)
        })
    )

    router.post('/delete/:name(*)',
        param('name').trim().notEmpty(),
        validateRequest,
        csrfProtection,
        chkCaptcha,
        requirePermission('deletepage', {
            mode: 'enforce'
        }),
        asyncRoute(async (req, res) => {
            await deletePageController(req, res)
        })
    )

    return router
}
