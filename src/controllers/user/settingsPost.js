import { AuthenticationRequiredError, ValidationError } from '../../services/errors.js'

export default async (req, res) => {
    if (!req.session.username) {
        throw new AuthenticationRequiredError()
    }

    switch (req.params.name) {
        case 'changeSkin':
            await req.app.locals.services.user.changeSkin(req.session.username, req.body.skin)
            return res.json({ success: true })
        case 'changePassword':
            await req.app.locals.services.user.changePassword(req.session.username, req.body.oldpassword, req.body.password)
            return res.json({ success: true })
        default:
            return res.status(400).json({ error: true, message: 'Unknown settings action' })
    }
}
