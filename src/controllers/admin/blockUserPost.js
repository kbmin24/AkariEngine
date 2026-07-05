import logger from '../../utils/logger.js'
import { ValidationError } from '../../services/errors.js'

export default async (req, res) => {
    try {
        const result = await req.app.locals.services.block.blockUser({
            actor: req.session.username,
            target: req.body.target,
            blockFor: req.body.blockfor,
            comment: req.body.comment || ''
        })

        await req.app.locals.services.admin.insertAdminLog(req.session.username, result.description)
        logger.admin(`${req.session.username} ${result.description}`)

        res.json({ success: true })
    } catch (error) {
        if (error instanceof ValidationError) {
            const i18nKeyMap = {
                BLOCK_USER_NOT_FOUND: 'nosuchuser',
                USER_NOT_BLOCKED: 'userNotBlocked',
                USER_ALREADY_BLOCKED: 'userAlreadyBlocked'
            }
            return res.status(400).json({ error: true, i18nKey: i18nKeyMap[error.code] || null, code: error.code })
        }
        throw error
    }
}
