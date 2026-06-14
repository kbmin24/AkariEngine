import logger from '../../utils/logger.js'

export default async (req, res) => {
    if (req.body.password !== req.body.passwordConfirm) {
        return res.status(400).json({ error: true, i18nKey: 'register_pwNotMatch' })
    }

    try {
        await req.app.locals.services.user.register(req.ipAddress, req.body.id, req.body.password)
        res.json({ success: true, i18nKey: 'register_done' })
    } catch (e) {
        logger.error(`Registration error\nid: ${req.body.id}\nerror: ${e.stack}`)
        res.status(500).json({ error: true, i18nKey: 'register_fail' })
    }
}
