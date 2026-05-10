import renderError from '../../utils/error.js'
import { BACK_LINK } from '../../utils/httpHelper.js'
export default async (req, res) =>
{
    try
    {
        let threadID = await req.app.locals.services.thread.createThread(
        req.session.username,
        req.ipAddress,
        req.body.title,
        req.params.name,
        req.body.comment
    )

    res.redirect('/thread/' + threadID)
    }
    catch (e)
    {
        renderError(req, res, {
            description: res.__(e.i18nKey),
            returnLink: BACK_LINK,
            returnName: res.__('previousPage'),
            statusCode: 400
        })
    }
}
