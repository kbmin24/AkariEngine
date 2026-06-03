import { genCaptcha } from '../../utils/captcha.js'

export default async (req, res) => {
    const title = req.params.name
    const { services } = req.app.locals

    const openThreads = await services.thread.getOpenThreadsByPageName(title, req.session.username, req.ipAddress) || []
    const closedThreads = await services.thread.getClosedThreadsByPageName(req.session.username, req.ipAddress, title) || []

    res.json({
        pagename: title,
        openThreads,
        closedThreads,
        captcha: await genCaptcha()
    })
}
