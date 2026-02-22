const express = require('express')
const i18n = require("i18n")
const paths = require('../utils/paths')
const {
    load,
    asyncRoute,
    renderTemplateInLayout,
    BACK_LINK,
    LOGIN_LINK
} = require('../utils/httpHelper')
const { param, query, body } = require('express-validator')

const { requirePermission } = require('../middlewares/permission')
const { chkCaptcha } = require('../middlewares/chkCaptcha')

const { validateRequest } = require(paths.middleware('validation'))
const { requirePageAccess } = require(paths.middleware('permission'))

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

module.exports = (services, options = {}) => {
    const router = express.Router()

    const csrfProtection = options.csrfProtection

    router.get('/w/:name(*)',
        param('name').trim().notEmpty(),
        query('rev').optional().isInt(),
        validateRequest,
        requirePageAccess('read', accessOptions('view_noacl')),
        asyncRoute(async (req, res) => {
            const viewHandler = require(paths.resolve('pages', 'view.js'))
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
            await load('controllers', 'pages/preview.js')(req, res)
        }))

    router.get('/search', asyncRoute(async (req, res) => {
        await load('pages', 'search.js')(req, res, global.db.pages)
    }))

    router.post('/search', asyncRoute(async (req, res) => {
        await load('pages', 'navSearch.js')(req, res, global.db.pages)
    }))

    router.get('/protect/:name(*)', asyncRoute(async (req, res) => {
        await load('admin', 'protectGet.js')(req, res, global.db.perm, global.db.protect, global.db.block)
    }))

    router.post('/protect/:name(*)', asyncRoute(async (req, res) => {
        await load('admin', 'protectPost.js')(req, res, global.db.perm, global.db.protect, global.db.pages, global.db.history, global.db.recentchanges, global.db.block)
    }))

    router.get('/raw/:name(*)',
        param('name').trim().notEmpty(),
        query('rev').optional().isInt(),
        validateRequest,
        requirePageAccess('read', accessOptions('view_noacl')),
        asyncRoute(async (req, res) => {
            await require(paths.controller('pages/rawGet'))(req, res)
        })
    )

    router.get('/history/:name(*)', asyncRoute(async (req, res) => {
        await load('pages', 'history.js')(req, res, global.db.history)
    }))

    router.get('/diff/:name(*)', asyncRoute(async (req, res) => {
        await load('pages', 'diff.js')(req, res, global.db.history, global.db.protect, global.db.perm, global.db.block)
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
        await load('pages', 'pagelist.js')(req, res, global.db.pages)
    }))

    router.get('/category/:name(*)', asyncRoute(async (req, res) => {
        await load('pages', 'category.js')(req, res, global.db.category)
    }))

    router.get('/viewrank', asyncRoute(async (req, res) => {
        await load('pages', 'viewrank.js')(req, res, global.db.viewcount)
    }))

    router.get('/xref/:name(*)', asyncRoute(async (req, res) => {
        await load('pages', 'xref.js')(req, res)
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
            await load('controllers', 'pages/editGet.js')(req, res)
        })
    )

    router.post('/edit/:name(*)',
        csrfProtection,
        chkCaptcha,
        requirePageAccess('edit', accessOptions('edit_noacl')),
        asyncRoute(async (req, res) => {
            await load('controllers', 'pages/editPost.js')(req, res)
        })
    )

    router.get('/move/:name(*)',
        csrfProtection,
        requirePageAccess('move', accessOptions('move_noacl')),
        asyncRoute(async (req, res) => {
            await load('controllers', 'pages/moveGet.js')(req, res)
        })
    )

    router.get('/delete/:name(*)',
        csrfProtection,
        requirePermission('deletepage', {
            mode: 'enforce'
        }),
        asyncRoute(async (req, res) => {
            await load('controllers', 'pages/deleteGet.js')(req, res)
        })
    )

    router.get('/revert/:name(*)',
        param('name').trim().notEmpty(),
        query('rev').isInt(),
        validateRequest,
        requirePageAccess('read', accessOptions('view_noacl')),
        csrfProtection,
        asyncRoute(async (req, res) => {
            await load('pages', 'revertGet.js')(req, res)
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
            await load('pages', 'revert.js')(req, res)
        })
    )

    router.post('/move/:name(*)',
        csrfProtection,
        chkCaptcha,
        requirePageAccess('move', accessOptions('move_noacl')),
        asyncRoute(async (req, res) => {
            await load('controllers', 'pages/movePost.js')(req, res)
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
            await load('pages', 'delete.js')(req, res)
        })
    )

    return router
}
