import logger from '../../utils/logger.js'

export default async (req, res) => {
    const username = req.body.id

    const exists = await req.app.locals.services.user.exists(username)
    if (!exists) {
        logger.warn('Login error (no such user)', { id: req.body.id })
        return res.status(401).json({ error: true, i18nKey: 'nosuchuser' })
    }

    if (await req.app.locals.services.user.verifyPassword(username, req.body.password)) {
        req.session.username = username
        await req.app.locals.services.loginHistory.createLoginRecord(username, req.ipAddress)
        res.json({ success: true })
    } else {
        logger.warn('Login error (incorrect password)', { id: req.body.id })
        res.status(401).json({ error: true, i18nKey: 'invalidpassword' })
    }
}
