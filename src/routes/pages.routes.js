const express = require('express')
const paths = require('../utils/paths')
const { body, param, query } = require('express-validator')
const { validateRequest } = require(paths.middleware('validation'))
const { verifyAuthentication } = require(paths.middleware('auth'))

const router = express.Router()

module.exports = (services, options = {}) => {
    const csrfProtection = options.csrfProtection

    router.get('/w/:name(*)',
        param('name').trim().notEmpty(),
        query('rev').optional().isInt(),
        validateRequest,
        async (req, res, next) => {
            try {
                // TODO refactor this legacy view.js
                const viewHandler = require(paths.resolve('pages', 'view.js'))
                await viewHandler(
                    req,
                    res,
                    global.db.pages,
                    global.db.mfile,
                    global.db.history,
                    global.db.protect,
                    global.db.perm,
                    global.db.block,
                    global.db.category,
                    global.db.viewcount,
                    global.db.updateTime
                )
            } catch (error) {
                next(error)
            }
        }
    )

    router.get('/edit/:name(*)',
        csrfProtection,
        verifyAuthentication,
        param('name').trim().notEmpty(),
        validateRequest,
        async (req, res, next) => {
            try {
                let content = ''
                try {
                    const page = await services.page.getPage(req.params.name, {
                        user: req.session.username
                    })
                    content = page.content
                } catch (_error) {
                    content = ''
                }

                res.render('pages/edit.ejs', {
                    title: req.params.name,
                    content,
                    username: req.session.username,
                    csrfToken: req.csrfToken(),
                    l: global.i18n.__,
                    prefix: '',
                    suffix: ''
                })
            } catch (error) {
                next(error)
            }
        }
    )

    router.post('/edit/:name(*)',
        csrfProtection,
        verifyAuthentication,
        param('name').trim().notEmpty().isLength({ max: 255 }),
        body('content').notEmpty(),
        body('comment').optional().trim(),
        validateRequest,
        async (req, res, next) => {
            try {
                await services.page.editPage({
                    title: req.params.name,
                    content: req.body.content,
                    user: req.session.username,
                    comment: req.body.comment
                })
                res.redirect(`/w/${req.params.name}`)
            } catch (error) {
                next(error)
            }
        }
    )

    router.post('/delete/:name(*)',
        csrfProtection,
        verifyAuthentication,
        param('name').trim().notEmpty(),
        validateRequest,
        async (req, res, next) => {
            try {
                await services.page.deletePage(req.params.name, req.session.username)
                res.redirect('/')
            } catch (error) {
                next(error)
            }
        }
    )

    router.post('/move/:name(*)',
        csrfProtection,
        verifyAuthentication,
        param('name').trim().notEmpty(),
        body('newName').trim().notEmpty().isLength({ max: 255 }),
        validateRequest,
        async (req, res, next) => {
            try {
                await services.page.movePage(req.params.name, req.body.newName, req.session.username)
                res.redirect(`/w/${req.body.newName}`)
            } catch (error) {
                next(error)
            }
        }
    )

    return router
}
