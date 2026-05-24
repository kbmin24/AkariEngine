import logger from '../../utils/logger.js'
import renderError from '../../utils/error.js'
import renderInfo from '../../info.js'
import { ValidationError, PermissionDeniedError, AuthenticationRequiredError } from '../../services/errors.js'

export default async (req, res) => {
    try {
        const result = await req.app.locals.services.block.blockUser({
            actor: req.session.username,
            target: req.body.target,
            blockFor: req.body.blockfor,
            comment: req.body.comment || ''
        })

        await req.app.locals.services.admin.insertAdminLog(
            req.session.username,
            result.description
        )

        logger.admin(`${req.session.username} ${result.description}`)
        renderInfo(req, res, { description: res.__('done'), returnLink: '/admin', returnName: res.__('adminpage') })
    }
    catch (error) {
        if (error instanceof ValidationError) {
            // localise messages
            switch (error.code) {
                case 'BLOCK_USER_NOT_FOUND':
                    {
                        renderError(req, res, {
                            description: res.__('nosuchuser'),
                            returnLink: '/admin/blockuser',
                            returnName: res.__('blockUser')
                        })
                        break
                    }
                case 'USER_NOT_BLOCKED':
                    {
                        renderError(req, res, {
                            description: res.__('userNotBlocked'),
                            returnLink: '/admin/blockuser',
                            returnName: res.__('blockUser')
                        })
                        break
                    }
                case 'USER_ALREADY_BLOCKED':
                    {
                        renderError(req, res, {
                            description: res.__('userAlreadyBlocked'),
                            returnLink: '/admin/blockuser',
                            returnName: res.__('blockUser')
                        })
                        break
                    }
            }
        }
        else if (error instanceof PermissionDeniedError) {
            logger.admin('Unauthorised block attempt', req.session.username, { ip: req.ipAddress })
            renderError(req, res, {
                description: 'You do not have a block permission',
                returnLink: '/admin',
                returnName: 'the admin page',
                statusCode: 403
            })
            return
        }
        else if (error instanceof AuthenticationRequiredError) {
            logger.admin('Unauthenticated block attempt', null, { ip: req.ipAddress })
            renderError(req, res, {
                description: 'Authentication required',
                returnLink: '/login',
                returnName: 'the login page',
                statusCode: 401
            })
            return
        }
        else {
            renderError(req, res, {
                description: "Unknown Error.",
                returnLink: '/admin',
                returnName: 'the admin page',
                statusCode: 500
            })
            return
        }
    }
}
