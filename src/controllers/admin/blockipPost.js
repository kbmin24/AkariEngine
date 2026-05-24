import logger from '../../utils/logger.js'
import { ValidationError, PermissionDeniedError } from '../../services/errors.js'
import renderInfo from '../../info.js'
import renderError from '../../utils/error.js'

export default async (req, res) => {
    const username = req.session.username

    try {
        const result = await req.app.locals.services.block.blockIp({
            actor: username,
            target: req.body.target,
            blockFor: req.body.blockfor,
            allowLogin: req.body.allowLogin === 'allowLogin' || req.body.allowLogin === true,
            comment: req.body.comment || ''
        })

        await req.app.locals.services.admin.insertAdminLog(
            username,
            result.description
        )

        renderInfo(req, res, { description: res.__('done'), returnLink: '/admin', returnName: res.__('adminpage') })
    } catch (error) {
        if (error instanceof PermissionDeniedError) {
            logger.admin('Unauthorised block attempt', username, { ip: req.ipAddress })
            renderError(req, res, {
                description: 'You do not have a block permission',
                returnLink: '/admin',
                returnName: 'the admin page'
            })
            return
        }

        if (error instanceof ValidationError) {
            switch (error.code) {
                // localise messages
                case 'INVALID_CIDR':
                    {
                        renderError(req, res, {
                            description: res.__('invalidCIDR'),
                            returnLink: '/admin/blockip',
                            returnName: res.__('blockIpAddr')
                        })
                        break
                    }
                case 'IP_NOT_BLOCKED':
                    {
                        renderError(req, res, {
                            description: res.__('ipNotBlocked'),
                            returnLink: '/admin/blockip',
                            returnName: res.__('blockIpAddr')
                        })
                        break
                    }
                case 'IP_ALREADY_BLOCKED':
                    {
                        renderError(req, res, {
                            description: res.__('ipAlreadyBlocked'),
                            returnLink: '/admin/blockip',
                            returnName: res.__('blockIpAddr')
                        })
                        break
                    }
            }
        }

        throw error
    }
}
