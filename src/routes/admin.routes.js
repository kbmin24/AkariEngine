import express from 'express'
import { asyncRoute } from '../utils/httpHelper.js'
import { requirePermission } from '../middlewares/auth.js'
import { param, query } from 'express-validator'
import { validateRequest } from '../middlewares/validation.js'
import grantPost from '../controllers/admin/grantPost.js'
import blockUserPost from '../controllers/admin/blockUserPost.js'
import blockipPost from '../controllers/admin/blockipPost.js'
import hiderevGet from '../controllers/admin/hiderevGet.js'
import hiderevPost from '../controllers/admin/hiderevPost.js'
import hideThreadCommentPost from '../controllers/admin/hideThreadCommentPost.js'
import changeThreadStatusPost from '../controllers/admin/changeThreadStatusPost.js'
import changeThreadTitlePost from '../controllers/admin/changeThreadTitlePost.js'
import adminlogGetHandler from '../controllers/admin/adminlogGet.js'
import loginhistoryGetHandler from '../controllers/admin/loginhistoryGet.js'
import protectGet from '../controllers/admin/protectGet.js'
import protectPost from '../controllers/admin/protectPost.js'
import grantGet from '../controllers/admin/grantGet.js'
import adminmenuGet from '../controllers/admin/adminmenuGet.js'

export default (options = {}) => {
    const router = express.Router()
    const csrfProtection = options.csrfProtection

    router.get('/admin',
        requirePermission('admin'),
        asyncRoute(adminmenuGet)
    )

    router.get('/admin/grant',
        requirePermission('grant'),
        param('grantTo').optional().isString(),
        validateRequest,
        asyncRoute(grantGet)
    )

    router.get('/admin/blockuser',
        requirePermission('block'),
        asyncRoute(async (req, res) => {
            // the only thing it does rn is permisison check
            res.json({})
        })
    )

    router.get('/admin/blockip',
        requirePermission('block'),
        asyncRoute(async (req, res) => {
            res.json({})
        })
    )

    router.get('/admin/loginhistory',
        requirePermission('loginhistory'),
        asyncRoute(loginhistoryGetHandler)
    )

    router.get('/admin/hiderev',
        requirePermission('acl'),
        asyncRoute(hiderevGet)
    )

    router.post('/admin/grant',
        csrfProtection,
        requirePermission('grant'),
        asyncRoute(grantPost)
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
        requirePermission('thread'),
        asyncRoute(hideThreadCommentPost)
    )

    router.post('/admin/changethreadstatus',
        csrfProtection,
        requirePermission('thread'),
        asyncRoute(changeThreadStatusPost)
    )

    router.post('/admin/changethreadname',
        csrfProtection,
        requirePermission('thread'),
        asyncRoute(changeThreadTitlePost)
    )

    router.get('/admin/developer',
        requirePermission('developer'),
        asyncRoute(async (req, res) => {
            res.json({})
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
