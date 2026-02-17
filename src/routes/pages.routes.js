const express = require('express')
const i18n = require("i18n")
const paths = require('../utils/paths')
const ejs = require('ejs')
const { param, query, body } = require('express-validator')
const { requirePermission } = require('../middleware/permission')
const { chkCaptcha } = require('../middleware/chkCaptcha')
const { validateRequest } = require(paths.middleware('validation'))
const { requirePageAccess } = require(paths.middleware('permission'))
const { ValidationError, PageNotFoundError } = require(paths.resolve('services', 'errors.js'))

const router = express.Router()

const load = (...segments) => require(paths.resolve(...segments))
const asyncRoute = (handler) => (req, res, next) => Promise.resolve(handler(req, res, next)).catch(next)
const renderLayout = (req, res, renderOpt) => load('view.js')(req, res, renderOpt)
const BACK_LINK = 'javascript:window.history.back()'
const LOGIN_LINK = '/login'

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

async function renderTemplateInLayout(req, res, templatePath, templateData, layoutData) {
    const html = await ejs.renderFile(paths.view(templatePath), templateData)
    renderLayout(req, res, {
        ...layoutData,
        content: html
    })
}

module.exports = (services, options = {}) => {
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

    router.post('/preview', asyncRoute(async (req, res) => {
        await load('pages', 'preview.js')(req, res, global.db.pages, global.db.mfile, global.db.category)
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

    router.get('/raw/:name(*)', asyncRoute(async (req, res) => {
        await load('pages', 'raw.js')(req, res, global.db.pages, global.db.history, global.db.protect, global.db.perm, global.db.block)
    }))

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
            try {
                const editModel = await req.app.locals.services.page.getEditViewModel({
                    title: req.params.name,
                    section: req.query.section,
                    aclState: req.editAcl,
                    username: req.session.username
                })

                const templateData = {
                    title: editModel.title,
                    content: editModel.content,
                    prefix: editModel.prefix,
                    suffix: editModel.suffix,
                    username: editModel.username,
                    l: i18n.__,
                    csrfToken: req.csrfToken(),
                    disabled: editModel.disabled
                }

                if (editModel.needsCaptcha) {
                    templateData.captcha = await load('utils', 'captcha.js').genCaptcha(req)
                } else {
                    templateData.captcha = ''
                }

                const html = await ejs.renderFile(paths.view('pages/edit.ejs'), templateData)
                renderLayout(req, res, {
                    title: i18n.__('edit_pg', { name: req.params.name }),
                    content: html,
                    isPage: true,
                    pageMode: editModel.disabled ? undefined : 'edit',
                    notification: editModel.notification,
                    pagename: req.params.name
                })
            } catch (error) {
                if (error instanceof ValidationError && error.i18nKey) {
                    load('error.js')(req, res, {
                        description: i18n.__(error.i18nKey),
                        returnLink: '/',
                        returnName: i18n.__('mainpage'),
                        statusCode: error.statusCode || 200
                    })
                    return
                }
                throw error
            }
        })
    )

    router.post('/edit/:name(*)',
        csrfProtection,
        chkCaptcha,
        requirePageAccess('edit', accessOptions('edit_noacl')),
        asyncRoute(async (req, res) => {
            try {
                await req.app.locals.services.page.editPage({
                    title: req.params.name,
                    content: req.body.content,
                    req,
                    editPrefix: req.body.editPrefix || '',
                    editSuffix: req.body.editSuffix || '',
                    user: req.session.username,
                    ipAddress: req.ipAddress,
                    comment: req.body.comment
                })
                res.redirect(`/w/${req.params.name}`)
            } catch (error) {
                if (error instanceof ValidationError && error.i18nKey === 'edit_titleneeded') {
                    load('error.js')(req, res, {
                        description: i18n.__('edit_titleneeded'),
                        returnLink: '/',
                        returnName: i18n.__('mainpage'),
                        statusCode: 200
                    })
                    return
                }
                if (error instanceof ValidationError && error.i18nKey === 'pagename_illegalfile') {
                    load('error.js')(req, res, {
                        description: i18n.__('pagename_illegalfile'),
                        returnLink: '/',
                        returnName: i18n.__('mainpage'),
                        statusCode: 200
                    })
                    return
                }
                throw error
            }
        })
    )

    router.get('/move/:name(*)',
        csrfProtection,
        requirePageAccess('move', accessOptions('move_noacl')),
        asyncRoute(async (req, res) => {
            try {
                const model = await req.app.locals.services.page.getMoveViewModel({
                    title: req.params.name,
                    username: req.session.username
                })

                const captchaSVG = await load('utils', 'captcha.js').genCaptcha(req)
                await renderTemplateInLayout(req, res, 'pages/move.ejs', {
                    originalName: model.originalName,
                    l: i18n.__,
                    username: model.username,
                    captcha: captchaSVG,
                    csrfToken: req.csrfToken()
                }, {
                    title: i18n.__('movepg', { name: req.params.name }),
                    isPage: true,
                    pagename: req.params.name,
                    pageMode: 'move',
                    username: model.username,
                    ipaddr: req.ipAddress
                })
            } catch (error) {
                if (error instanceof ValidationError && error.i18nKey === 'move_nofile') {
                    load('error.js')(req, res, {
                        description: i18n.__('move_nofile'),
                        returnLink: BACK_LINK,
                        returnName: i18n.__('previousPage'),
                        statusCode: 200
                    })
                    return
                }
                if (error instanceof PageNotFoundError) {
                    load('error.js')(req, res, {
                        description: `${i18n.__('page404')} <a href="/edit/${req.params.name}"> ${i18n.__('page_asknew')}</a>`,
                        returnLink: '/',
                        returnName: i18n.__('mainpage'),
                        statusCode: 404
                    })
                    return
                }
                throw error
            }
        })
    )

    router.get('/delete/:name(*)',
        csrfProtection,
        requirePermission('delete', {
            mode: 'enforce'
        }),
        asyncRoute(async (req, res) => {
            try {
                const model = await req.app.locals.services.page.getDeleteViewModel({
                    title: req.params.name,
                    username: req.session.username
                })

                await renderTemplateInLayout(req, res, 'pages/delete.ejs', {
                    title: model.title,
                    l: i18n.__,
                    username: model.username,
                    csrfToken: req.csrfToken()
                }, {
                    title: i18n.__('deletepg', { name: req.params.name }),
                    isPage: true,
                    pageMode: 'delete',
                    pagename: model.pagename
                })
            } catch (error) {
                if (error instanceof PageNotFoundError) {
                    load('error.js')(req, res, {
                        description: `${i18n.__('page404')} <a href="/edit/${req.params.name}">${i18n.__('page_asknew')}</a>`,
                        returnLink: '/',
                        returnName: i18n.__('mainpage'),
                        statusCode: 404
                    })
                    return
                }
                throw error
            }
        })
    )

    router.get('/revert/:name(*)',
        param('name').trim().notEmpty(),
        query('rev').isInt(),
        validateRequest,
        requirePageAccess('read', accessOptions('view_noacl')),
        csrfProtection,
        asyncRoute(async (req, res) => {
            const username = req.session.username
            const p = await req.app.locals.repositories.pages.findByTitle(req.params.name)
            if (!p)
            {
                load('error.js')(req, res, {
                    description: `${i18n.__('page404')} <a href="/edit/${req.params.name}">${i18n.__('page_asknew')}</a>`,
                    returnLink: '/',
                    returnName: i18n.__('mainpage'),
                    statusCode: 404
                })
                return
            }
            const captchaSVG = await load('utils', 'captcha.js').genCaptcha(req)
            ejs.renderFile(paths.view('pages/revert.ejs'),
            {
                pagename: req.params.name,
                l: i18n.__,
                username: username,
                rev: req.query.rev,
                captcha: captchaSVG,
                csrfToken: req.csrfToken()
            }, (err, html) => 
            {
                if (err)
                {
                    logger.error('Revert page rendering failed', err)
                    res.writeHead(500).write('Internal Server Error')
                    return
                }
                load('view.js')(req, res,
                {
                    title: i18n.__('revert_title', {page: req.params.name, rev: req.query.rev}),
                    content: html,
                    username: username,
                    ipaddr: req.ipAddress,
                    
                })
            })
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
            await load('pages', 'revert.js')(
                req,
                res,
                global.db.perm
            )
        })
    )

    router.post('/move/:name(*)',
        csrfProtection,
        chkCaptcha,
        requirePageAccess('move', accessOptions('move_noacl')),
        asyncRoute(async (req, res) => {
            await load('pages', 'move.js')(req, res)
        })
    )

    router.post('/delete/:name(*)',
        param('name').trim().notEmpty(),
        validateRequest,
        csrfProtection,
        chkCaptcha,
        requirePermission('delete', {
            mode: 'enforce'
        }),
        asyncRoute(async (req, res) => {
            await load('pages', 'delete.js')(req, res)
        })
    )

    return router
}
