const express = require('express')
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
        requirePageAccess('read', {
            noAclMessageKey: 'view_noacl',
            permissionReturnLink: '/login',
            permissionReturnName: 'loginpage',
            authReturnLink: '/login',
            authReturnName: 'loginpage'
        }),
        asyncRoute(async (req, res) => {
            const viewHandler = require(paths.resolve('pages', 'view.js'))
            await viewHandler(req, res)
        })
    )

    router.get('/edit/:name(*)',
        csrfProtection,
        requirePageAccess('read', {
            noAclMessageKey: 'view_noacl',
            permissionReturnLink: '/login',
            permissionReturnName: 'loginpage',
            authReturnLink: '/login',
            authReturnName: 'loginpage'
        }), // We do this because not having edit access gives out the page's source code
        requirePageAccess('edit', {
            noAclMessageKey: 'edit_noacl',
            permissionReturnLink: '/login',
            permissionReturnName: 'loginpage',
            authReturnLink: '/login',
            authReturnName: 'loginpage',
            mode: 'store',
            storeKey: 'editAcl',
        }),
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
                    l: global.i18n.__,
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
                    title: global.i18n.__('edit_pg', { name: req.params.name }),
                    content: html,
                    isPage: true,
                    pageMode: editModel.disabled ? undefined : 'edit',
                    notification: editModel.notification,
                    pagename: req.params.name
                })
            } catch (error) {
                if (error instanceof ValidationError && error.i18nKey) {
                    load('error.js')(req, res, null, global.i18n.__(error.i18nKey), '/', global.i18n.__('mainpage'), error.statusCode || 200)
                    return
                }
                throw error
            }
        })
    )

    router.post('/edit/:name(*)',
        csrfProtection,
        chkCaptcha,
        requirePageAccess('edit', {
            noAclMessageKey: 'edit_noacl',
            permissionReturnLink: '/login',
            permissionReturnName: 'loginpage',
            authReturnLink: '/login',
            authReturnName: 'loginpage'
        }),
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
                    load('error.js')(req, res, null, global.i18n.__('edit_titleneeded'), '/', global.i18n.__('mainpage'), 200)
                    return
                }
                if (error instanceof ValidationError && error.i18nKey === 'pagename_illegalfile') {
                    load('error.js')(req, res, null, global.i18n.__('pagename_illegalfile'), '/', global.i18n.__('mainpage'), 200)
                    return
                }
                throw error
            }
        })
    )

    router.get('/move/:name(*)',
        csrfProtection,
        requirePageAccess('move', {
            noAclMessageKey: 'move_noacl',
            permissionReturnLink: '/login',
            permissionReturnName: 'loginpage',
            authReturnLink: '/login',
            authReturnName: 'loginpage'
        }),
        asyncRoute(async (req, res) => {
            try {
                const model = await req.app.locals.services.page.getMoveViewModel({
                    title: req.params.name,
                    username: req.session.username
                })

                const captchaSVG = await load('utils', 'captcha.js').genCaptcha(req)
                await renderTemplateInLayout(req, res, 'pages/move.ejs', {
                    originalName: model.originalName,
                    l: global.i18n.__,
                    username: model.username,
                    captcha: captchaSVG,
                    csrfToken: req.csrfToken()
                }, {
                    title: global.i18n.__('movepg', { name: req.params.name }),
                    isPage: true,
                    pagename: req.params.name,
                    pageMode: 'move',
                    username: model.username,
                    ipaddr: req.ipAddress
                })
            } catch (error) {
                if (error instanceof ValidationError && error.i18nKey === 'move_nofile') {
                    load('error.js')(req, res, null, global.i18n.__('move_nofile'), '/', global.i18n.__('pagename_toolong'), 200)
                    return
                }
                if (error instanceof PageNotFoundError) {
                    load('error.js')(req, res, null, `${global.i18n.__('page404')} <a href="/edit/${req.params.name}"> ${global.i18n.__('page_asknew')}</a>`, '/', global.i18n.__('mainpage'), 404)
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
                    l: global.i18n.__,
                    username: model.username,
                    csrfToken: req.csrfToken()
                }, {
                    title: global.i18n.__('deletepg', { name: req.params.name }),
                    isPage: true,
                    pageMode: 'delete',
                    pagename: model.pagename
                })
            } catch (error) {
                if (error instanceof PageNotFoundError) {
                    load('error.js')(req, res, null, `${global.i18n.__('page404')} <a href="/edit/${req.params.name}">${global.i18n.__('page_asknew')}</a>`, '/', global.i18n.__('mainpage'), 404, 'ko')
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
        requirePageAccess('read', {
            noAclMessageKey: 'view_noacl',
            permissionReturnLink: '/login',
            permissionReturnName: 'loginpage',
            authReturnLink: '/login',
            authReturnName: 'loginpage'
        }),
        csrfProtection,
        asyncRoute(async (req, res) => {
            const username = req.session.username
            const p = await req.app.locals.repositories.pages.findByTitle(req.params.name)
            if (!p)
            {
                load('error.js')(req, res, null, `${global.i18n.__('page404')} <a href="/edit/${req.params.name}">${global.i18n.__('page_asknew')}</a>`, '/', global.i18n.__('mainpage'), 404, 'ko')
                return
            }
            const captchaSVG = await load('utils', 'captcha.js').genCaptcha(req)
            ejs.renderFile(paths.view('pages/revert.ejs'),
            {
                pagename: req.params.name,
                l: global.i18n.__,
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
                    title: global.i18n.__('revert_title', {page: req.params.name, rev: req.query.rev}),
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
        requirePageAccess('read', {
            noAclMessageKey: 'view_noacl',
            permissionReturnLink: '/login',
            permissionReturnName: 'loginpage',
            authReturnLink: '/login',
            authReturnName: 'loginpage'
        }),
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
        requirePageAccess('move', {
            noAclMessageKey: 'move_noacl',
            permissionReturnLink: '/login',
            permissionReturnName: 'loginpage',
            authReturnLink: '/login',
            authReturnName: 'loginpage'
        }),
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
