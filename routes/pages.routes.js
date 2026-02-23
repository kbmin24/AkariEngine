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
import searchPage from '../pages/search.js'
import navSearchPage from '../pages/navSearch.js'
import protectGet from '../admin/protectGet.js'
import protectPost from '../admin/protectPost.js'
import rawGetController from '../controllers/pages/rawGet.js'
import historyPage from '../pages/history.js'
import diffPage from '../pages/diff.js'
import pageListPage from '../pages/pagelist.js'
import categoryPage from '../pages/category.js'
import viewRankPage from '../pages/viewrank.js'
import xrefPage from '../pages/xref.js'
import editGetController from '../controllers/pages/editGet.js'
import editPostController from '../controllers/pages/editPost.js'
import moveGetController from '../controllers/pages/moveGet.js'
import deleteGetController from '../controllers/pages/deleteGet.js'
import revertGetPage from '../controllers/pages/revertGet.js'
import revertPage from '../pages/revert.js'
import movePostController from '../controllers/pages/movePost.js'
import deletePage from '../pages/delete.js'

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
        requirePageAccess('read', accessOptions('view_noacl')),
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

    router.get('/search', asyncRoute(async (req, res) => {
        await searchPage(req, res, global.db.pages)
    }))

    router.post('/search', asyncRoute(async (req, res) => {
        await navSearchPage(req, res, global.db.pages)
    }))

    router.get('/protect/:name(*)', asyncRoute(async (req, res) => {
        await protectGet(req, res, global.db.perm, global.db.protect, global.db.block)
    }))

    router.post('/protect/:name(*)', asyncRoute(async (req, res) => {
        await protectPost(req, res, global.db.perm, global.db.protect, global.db.pages, global.db.history, global.db.recentchanges, global.db.block)
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

    router.get('/history/:name(*)', asyncRoute(async (req, res) => {
        await historyPage(req, res, global.db.history)
    }))

    router.get('/diff/:name(*)', asyncRoute(async (req, res) => {
        await diffPage(req, res, global.db.history, global.db.protect, global.db.perm, global.db.block)
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

    router.get('/xref/:name(*)', asyncRoute(async (req, res) => {
        await xrefPage(req, res)
    }))

    router.get('/RandomPage', asyncRoute(async (req, res) => {
        const randomPage = await global.db.pages.findOne({ order: global.sequelize.random() })
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
            await deletePage(req, res)
        })
    )

    return router
}
