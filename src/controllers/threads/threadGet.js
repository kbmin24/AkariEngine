import i18n from 'i18n'
import renderError from '../../utils/error.js'
import { renderTemplateInLayout, BACK_LINK } from '../../utils/httpHelper.js'

// not to be confused with thread_s_Get.js which is for list
export default async (req, res) => {
    const roomId = req.params.name
    const services = req.app.locals.services

    const thread = await services.thread.getThread(roomId)
    if (!thread) {
        return renderError(req, res, {
            description: i18n.__('thread404'),
            returnLink: BACK_LINK,
            returnName: i18n.__('previousPage'),
            statusCode: 404
        })
    }

    const isAdmin = await services.permission.hasPermission(req.session.username, 'thread')

    await renderTemplateInLayout(req, res, 'threads/thread.ejs', {
        roomId,
        username: req.session.username || req.ipAddress,
        isAdmin,
        csrfToken: req.csrfToken()
    }, {
        title: `${thread.pagename} ${i18n.__('discussion')} - ${thread.threadTitle}`,
        isPage: true,
        pageMode: 'threads',
        pagename: thread.pagename
    })
}
