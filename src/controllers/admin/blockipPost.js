import { ValidationError } from '../../services/errors.js'

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

        await req.app.locals.services.admin.insertAdminLog(username, result.description)

        res.json({ success: true })
    } catch (error) {
        if (error instanceof ValidationError) {
            const i18nKeyMap = {
                INVALID_CIDR: 'invalidCIDR',
                IP_NOT_BLOCKED: 'ipNotBlocked',
                IP_ALREADY_BLOCKED: 'ipAlreadyBlocked'
            }
            return res.status(400).json({ error: true, i18nKey: i18nKeyMap[error.code] || null, code: error.code })
        }
        throw error
    }
}
