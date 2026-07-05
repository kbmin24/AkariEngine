import { genCaptcha } from '../../utils/captcha.js'

export default async (req, res) => {
    const model = await req.app.locals.services.page.getMoveViewModel({
        title: req.params.name,
        username: req.session.username
    })

    res.json({
        originalName: model.originalName,
        username: model.username,
        captcha: await genCaptcha()
    })
}
