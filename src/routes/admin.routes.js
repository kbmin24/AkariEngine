import express from 'express'
import { asyncRoute, renderTemplateInLayout } from '../utils/httpHelper.js'
import { requirePermission } from '../middlewares/auth.js'
import { param, query } from 'express-validator'
import { validateRequest } from '../middlewares/validation.js'
import grantAdmin from '../admin/grant.js'
import blockUserPost from '../controllers/admin/blockUserPost.js'
import blockipPost from '../controllers/admin/blockipPost.js'
import hiderevGet from '../controllers/admin/hiderevGet.js'
import hiderevPost from '../controllers/admin/hiderevPost.js'
import hideThreadCommentAdmin from '../admin/hidethreadcomment.js'
import changeThreadStatusAdmin from '../admin/changethreadstatus.js'
import changeThreadTitleAdmin from '../admin/changethreadtitle.js'
import adminlogGetHandler from '../controllers/admin/adminlogGet.js'
import loginhistoryGetHandler from '../controllers/admin/loginhistoryGet.js'
import protectGet from '../controllers/admin/protectGet.js'
import protectPost from '../controllers/admin/protectPost.js'
import grantGet from '../controllers/admin/grantGet.js'
import adminmenuGet from '../controllers/admin/adminmenuGet.js'

export default (services, options = {}) => {
    const router = express.Router()
    const csrfProtection = options.csrfProtection

    router.get('/admin',
        requirePermission('admin'),
        asyncRoute(adminmenuGet)
    )

    router.get('/admin/grant',
        csrfProtection,
        requirePermission('deletepage', { mode: 'grant' }),
        param('grantTo').optional().isString(),
        validateRequest,
        asyncRoute(grantGet)
    )

    router.get('/admin/blockuser',
        csrfProtection,
        requirePermission('block'),
        asyncRoute(async (req, res) => {
            await renderTemplateInLayout(req, res, 'admin/blockuser.ejs', { csrfToken: req.csrfToken() }, {
                title: 'Block user'
            })
        })
    )

    router.get('/admin/blockip',
        csrfProtection,
        requirePermission('block'),
        asyncRoute(async (req, res) => {
            await renderTemplateInLayout(req, res, 'admin/blockIP.ejs', { csrfToken: req.csrfToken() }, {
                title: res.__('blockIpAddr'),
                username: req.session.username,
                ipaddr: req.ipAddress
            })
        })
    )

    router.get('/admin/loginhistory',
        csrfProtection,
        requirePermission('loginhistory'),
        asyncRoute(loginhistoryGetHandler)
    )

    router.get('/admin/hiderev',
        csrfProtection,
        requirePermission('acl'),
        asyncRoute(hiderevGet)
    )

    router.post('/admin/grant',
        csrfProtection,
        asyncRoute(async (req, res) => {
            await grantAdmin(req, res, global.db.users, global.db.perm, global.db.adminlog)
        })
    )

    router.post('/admin/blockuser',
        csrfProtection,
        requirePermission('block'),
        asyncRoute(blockUserPost)
    )

    router.post('/admin/blockip',
        csrfProtection,
        requirePermission('block'),
        asyncRoute(blockipPost)
    )

    router.post('/admin/hiderev',
        requirePermission('acl'),
        csrfProtection,
        asyncRoute(hiderevPost)
    )

    router.post('/admin/hidethread',
        csrfProtection,
        asyncRoute(async (req, res) => {
            await hideThreadCommentAdmin(req, res, {
                perm: global.db.perm,
                threadcomment: global.db.threadcomment
            })
        })
    )

    router.post('/admin/changethreadstatus',
        csrfProtection,
        asyncRoute(async (req, res) => {
            await changeThreadStatusAdmin(req, res, {
                perm: global.db.perm,
                thread: global.db.thread,
                threadcomment: global.db.threadcomment
            })
        })
    )

    router.post('/admin/changethreadname',
        csrfProtection,
        asyncRoute(async (req, res) => {
            await changeThreadTitleAdmin(req, res, {
                perm: global.db.perm,
                thread: global.db.thread,
                threadcomment: global.db.threadcomment
            })
        })
    )

    router.get('/admin/developer',
        csrfProtection,
        requirePermission('developer'),
        asyncRoute(async (req, res) => {
            await renderTemplateInLayout(req, res, 'admin/developermenu.ejs', {}, {
                title: 'Developer console',
            })
        })
    )

    router.get('/adminlog',
        query('doneBy').optional().isString(),
        query('job').optional().isString(),
        query('from').optional().isInt(),
        validateRequest,
        asyncRoute(adminlogGetHandler)
    )

    router.get('/protect/:name(*)',
        param('name').trim().notEmpty(),
        validateRequest,
        asyncRoute(protectGet)
    )

    router.post('/protect/:name(*)',
        param('name').trim().notEmpty(),
        validateRequest,
        asyncRoute(protectPost)
    )

    return router
}
