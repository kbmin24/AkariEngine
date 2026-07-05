import { genCaptcha } from '../../utils/captcha.js'
import { PageNotFoundError } from '../../services/errors.js'

export default async (req, res) => {
    const p = await req.app.locals.repositories.pages.findByTitle(req.params.name)
    if (!p) throw new PageNotFoundError(req.params.name)

    res.json({
        pagename: req.params.name,
        username: req.session.username,
        rev: req.query.rev,
        captcha: await genCaptcha()
    })
}
