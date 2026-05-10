import logger from '../../utils/logger.js'
import renderError from '../../utils/error.js'
import { genCaptcha } from '../../utils/captcha.js'
import { renderTemplateInLayout } from '../../utils/httpHelper.js'
import i18n from 'i18n'

import {
    PageNotFoundError,
    AuthenticationRequiredError
} from '../../services/errors.js'

import { BACK_LINK } from '../../utils/httpHelper.js'

export default async (req, res) => {
    const title = req.params.name

    try {
        await req.app.locals.services.page.getPage(title, {
            user: req.session.username,
            ipAddress: req.ipAddress
        })
    }
    catch (e) {
        if (e instanceof PageNotFoundError) {
            renderError(req, res, {
                description: i18n.__('page404'),
                returnLink: BACK_LINK,
                returnName: i18n.__('previousPage'),
                statusCode: 404
            })
        } else if (e instanceof AuthenticationRequiredError) {
            // pass, since middleware would've handled this
        } else {
            logger.error('Unknown error while attempting to fetch page', e)
        }
    }

    let openThreads = await req.app.locals.services.thread.getOpenThreadsByPageName(
        title,
        req.session.username,
        req.ipAddress
    ) || []
    let closedThreads = await req.app.locals.services.thread.getClosedThreadsByPageName(
        req.session.username,
        req.ipAddress,
        title
    ) || []
    
    let captcha = await genCaptcha()

    renderTemplateInLayout(req, res, 'threads/threadlist.ejs',
        {
            pagename: title,
            captcha: captcha,
            openThreads: openThreads,
            closedThreads: closedThreads,
            t: i18n.__
        }, {
        title: i18n.__('threadOf', { page: title }),
        isPage: true,
        pageMode: "threads",
        pagename: title
    }
    )
}
