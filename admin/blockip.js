const paths = require('../utils/paths')
const logger = require(paths.util('logger'))
const { ValidationError, PermissionDeniedError } = require(paths.service('errors'))

module.exports = async (req, res, _users, _perm, _block, adminlog) => {
    const username = req.session.username

    try {
        const result = await req.app.locals.services.block.blockIp({
            actor: username,
            target: req.body.target,
            blockFor: req.body.blockfor,
            allowLogin: req.body.allowLogin === 'on' || req.body.allowLogin === true,
            comment: req.body.comment || ''
        })

        await adminlog.create({
            username,
            job: result.description
        })

        require(paths.resolve('info.js'))(req, res, null, 'Done.', '/admin', 'the admin page')
    } catch (error) {
        if (error instanceof PermissionDeniedError) {
            logger.admin('Unauthorised block attempt', username, { ip: req.ipAddress })
            require(paths.resolve('error.js'))(req, res, {
                description: 'You do not have a block permission',
                returnLink: '/admin',
                returnName: 'the admin page'
            })
            return
        }

        if (error instanceof ValidationError) {
            require(paths.resolve('error.js'))(req, res, {
                description: error.message,
                returnLink: '/admin/blockip',
                returnName: 'blockip page'
            })
            return
        }

        throw error
    }
}
