const express = require('express')
const paths = require('../utils/paths')
const date = require('date-and-time')
const ejs = require('ejs')
const { param, query, body } = require('express-validator')
const { requirePermission } = require('../middleware/permission')
const { chkCaptcha } = require('../middleware/chkCaptcha')
const { validateRequest } = require(paths.middleware('validation'))
const { requirePageAccess } = require(paths.middleware('permission'))

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

async function sign(req, settingsModel) {
    const dtnow = date.format(new Date(), global.dtFormat)
    if (req.session.username) {
        const s = await settingsModel.findOne({
            where: {
                user: req.session.username,
                key: 'sign'
            }
        })
        const prefix = s ? s.value : `[[User:${req.session.username}]]`
        return `${prefix} ${dtnow}`
    }

    return `${req.ipAddress} ${dtnow}`
}

async function signAsync(req, str, regex, settingsModel) {
    const promises = []
    str.replace(regex, () => {
        promises.push(sign(req, settingsModel))
    })
    const data = await Promise.all(promises)
    return str.replace(regex, () => data.shift())
}

async function regLink(title, content) {
    await global.db.links.destroy({ where: { source: title } })
    let res = []
    let found = new Set()

    {
        let r = /\[\[([^|\r\n]*?)\]\]/igm
        content = content.replace(r, (_match, p1) => {
            if (p1.toLowerCase().startsWith('category') ||
                p1.toLowerCase().startsWith('분류') ||
                p1.toLowerCase().startsWith('http://') ||
                p1.toLowerCase().startsWith('https://')) return ''
            if (found.has(p1)) return ''

            found.add(p1)
            res.push({ source: title, dest: p1 })
            return ''
        })
    }

    {
        let r = /\[\[(.*?)\|(.*?)\]\]/igm
        content = content.replace(r, (_match, p1) => {
            if (p1.toLowerCase().startsWith('category') ||
                p1.toLowerCase().startsWith('분류') ||
                p1.toLowerCase().startsWith('http://') ||
                p1.toLowerCase().startsWith('https://')) return ''
            if (found.has(p1)) return ''

            found.add(p1)
            res.push({ source: title, dest: p1 })
            return ''
        })
    }

    await global.db.links.bulkCreate(res)
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
        validateRequest,
        asyncRoute(async (req, res) => {
            let username = req.session.username

            if (req.params.name.length > 255) {
                load('error.js')(req, res, null, global.i18n.__('pagename_toolong'), '/', global.i18n.__('mainpage'), 200)
                return
            }

            if (!global.legalTitleRegex.test(req.params.name)) {
                load('error.js')(req, res, null, global.i18n.__('pagename_specialchar'), '/', global.i18n.__('mainpage'), 200)
                return
            }

            const target = await req.app.locals.repositories.pages.findByTitle(req.params.name)
            if (!target && req.params.name.toLowerCase().startsWith('file:')) {
                load('error.js')(req, res, null, global.i18n.__('pagename_illegalfile'), '/', global.i18n.__('mainpage'), 200)
                return
            }

            const actionAllowed = req.editAcl ? req.editAcl.allowed : true
            let prefix = ''
            let suffix = ''
            let content = target ? target.content : ''

            // am i editing a secetion?
            if (actionAllowed === true && target && req.query.section && !isNaN(req.query.section) && req.query.section * 1 > 0) {
                req.query.section *= 1
                let headLookupRegex = /(?=^(?:=+) (?:.*) =+(?: )*\r?\n)/gim
                let splits = content.split(headLookupRegex)
                let offset = 0
                if (/^(?:=+) (?:.*) =+(?: )*\r?\n/igm.test(splits[0])) offset = -1

                if (req.query.section + offset > splits) {
                    load('error.js')(req, res, null, global.i18n.__('edit_noparagraph'), '/', global.i18n.__('mainpage'), 200)
                    return
                }

                for (let i = 0; i < req.query.section + offset; i++) prefix += splits[i]
                for (let i = req.query.section + offset + 1; i < splits.length; i++) suffix += splits[i]
                content = splits[req.query.section + offset]
            }

            const templateData = {
                title: req.params.name,
                content,
                prefix,
                suffix,
                username,
                l: global.i18n.__,
                csrfToken: req.csrfToken()
            }

            if (actionAllowed === true) {
                templateData.captcha = await load('tools', 'captcha.js').genCaptcha(req)
            } else if (actionAllowed !== undefined) {
                templateData.disabled = true
                templateData.captcha = ""
            }

            const html = await ejs.renderFile(paths.view('pages/edit.ejs'), templateData)
            renderLayout(req, res, {
                title: global.i18n.__('edit_pg', { name: req.params.name }),
                content: html,
                isPage: true,
                pageMode: actionAllowed === true ? 'edit' : undefined,
                notification: actionAllowed === true ? undefined : actionAllowed,
                pagename: req.params.name
            })
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

            if (!req.params.name) {
                load('error.js')(req, res, null, global.i18n.__('edit_titleneeded'), '/', global.i18n.__('mainpage'), 200)
                return
            }

            if (!req.body.content) {
                load('error.js')(req, res, null, global.i18n.__('edit_titleneeded'), '/', global.i18n.__('mainpage'), 200)
                return
            }

            if (!req.body.content.endsWith('\n')) req.body.content += '\n'
            req.body.content = (req.body.editPrefix || '') + req.body.content + (req.body.editSuffix || '')
            req.body.content = req.body.content.replace(/\r/g, '')
            req.body.content = await signAsync(req, req.body.content, /~~~~/igm, global.db.settings)

            const page = await req.app.locals.repositories.pages.findByTitle(req.params.name)
            const doneby = req.session.username || req.ipAddress

            const categories = services.category.extractFromContent(req.body.content)
            await services.category.registerForPage(req.params.name, categories)
            await regLink(req.params.name, req.body.content)

            if (page) {
                const oldLength = page.content.length
                const newRev = page.currentRev + 1
                await req.app.locals.repositories.pages.upsertPage(
                    req.params.name,
                    req.body.content,
                    newRev,
                    false,
                    {
                        doneBy: doneby,
                        bytechange: req.body.content.length - oldLength,
                        comment: req.body.comment,
                        type: 'edit'
                    }
                )

                await req.app.locals.repositories.history.create({
                    page: req.params.name,
                    rev: newRev,
                    content: req.body.content,
                    bytechange: req.body.content.length - oldLength,
                    editedby: doneby,
                    comment: req.body.comment,
                    type: 'edit'
                })
            } else {
                if (req.params.name.toLowerCase().startsWith('file:')) {
                    load('error.js')(req, res, null, global.i18n.__('pagename_illegalfile'), '/', global.i18n.__('mainpage'), 200)
                    return
                }

                await req.app.locals.repositories.pages.upsertPage(
                    req.params.name,
                    req.body.content,
                    1,
                    false,
                    {
                        doneBy: doneby,
                        bytechange: req.body.content.length,
                        comment: req.body.comment,
                        type: 'create'
                    }
                )

                await req.app.locals.repositories.history.create({
                    page: req.params.name,
                    rev: 1,
                    content: req.body.content,
                    bytechange: req.body.content.length,
                    editedby: doneby,
                    comment: req.body.comment,
                    type: 'create'
                })
            }

            res.redirect(`/w/${req.params.name}`)
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
            if (req.params.name.toLowerCase().startsWith('file:')) {
                load('error.js')(req, res, null, global.i18n.__('move_nofile'), '/', global.i18n.__('pagename_toolong'), 200)
                return
            }

            const target = await req.app.locals.repositories.pages.findByTitle(req.params.name)
            if (!target) {
                load('error.js')(req, res, null, `${global.i18n.__('page404')} <a href="/edit/${req.params.name}"> ${global.i18n.__('page_asknew')}</a>`, '/', global.i18n.__('mainpage'), 404)
                return
            }

            const username = req.session.username
            const captchaSVG = await load('tools', 'captcha.js').genCaptcha(req)
            await renderTemplateInLayout(req, res, 'pages/move.ejs', {
                originalName: req.params.name,
                l: global.i18n.__,
                username,
                captcha: captchaSVG,
                csrfToken: req.csrfToken()
            }, {
                title: global.i18n.__('movepg', { name: req.params.name }),
                isPage: true,
                pagename: req.params.name,
                pageMode: 'move',
                username,
                ipaddr: req.ipAddress
            })
        })
    )

    router.get('/delete/:name(*)',
        csrfProtection,
        requirePermission('delete', {
            mode: 'enforce'
        }),
        asyncRoute(async (req, res) => {
            const username = req.session.username

            const target = await req.app.locals.repositories.pages.findByTitle(req.params.name)
            if (!target) {
                load('error.js')(req, res, null, `${global.i18n.__('page404')} <a href="/edit/${req.params.name}">${global.i18n.__('page_asknew')}</a>`, '/', global.i18n.__('mainpage'), 404, 'ko')
                return
            }

            await renderTemplateInLayout(req, res, 'pages/delete.ejs', {
                title: req.params.name,
                l: global.i18n.__,
                username,
                csrfToken: req.csrfToken()
            }, {
                title: global.i18n.__('deletepg', { name: req.params.name }),
                isPage: true,
                pageMode: 'delete',
                pagename: target.title
            })
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
            const captchaSVG = await load('tools', 'captcha.js').genCaptcha(req)
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
