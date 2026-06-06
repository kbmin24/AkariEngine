import escapeHtml from '../../utils/escapeHTML.js'
import { getOptions, showCategory } from '../../utils/wikimark/keywordHelper.js'
import { PageNotFoundError } from '../../services/errors.js'

export default async (req, res) => {
    const { services, repositories } = req.app.locals
    const name = req.params.name
    const rev = req.query.rev

    let titleSuffix = ''
    if (rev) titleSuffix = `(r${rev})&nbsp;`

    const usernameRegex = /User:(.*)/
    if (usernameRegex.test(name)) {
        const username = usernameRegex.exec(name)[1]
        if (username && await services.permission.hasPermission(username, 'admin')) {
            titleSuffix += `(${res.__('admin')})`
        }
    }

    let contentPrefix = ''
    if (name.toLowerCase().startsWith('file:')) {
        const filename = /File:(.*)/.exec(name)[1]
        if (/^(.*?\.(?:png|jpg|jpeg|gif|webp|svg))$/gi.test(filename)) {
            contentPrefix = `[file(${filename})]\n`
        } else if (/^(.*?\.pdf)$/gi.test(filename)) {
            contentPrefix = `[file(${filename}, width=100%, height=500px)]\n<a href='/uploads/${filename}'>Download</a>`
        }
    }

    if (rev === undefined) {
        let page = null
        try {
            page = await services.page.getPage(name, {
                user: req.session.username,
                ipAddress: req.ipAddress
            })
        } catch (e) {
            if (!(e instanceof PageNotFoundError)) throw e
        }

        if (page && !page.deleted) {
            await services.viewcount.incrementViewCount(name)

            const redirect = !(req.query.redirect == 'true' || req.query.from)
            if (req.query.from) {
                titleSuffix = res.__("page_redirectedfrom", { page: escapeHtml(req.query.from) }) + '&nbsp;' + titleSuffix
            }

            const opt = await getOptions(page.content)
            let { result, html: content } = await services.render.render(
                contentPrefix + page.content,
                { pagename: name, renderSectionEditButton: true },
                repositories,
                redirect
            )

            if (result === 'redirect') {
                return res.json({ redirect: `/w/${content}?redirect=true&from=${encodeURIComponent(name)}` })
            }

            const categories = await req.app.locals.services.category.getCategoriesForPage(name)
            return res.json({
                title: page.title,
                content,
                categories,
                showCategory: showCategory(page.title, opt['category']),
                isPage: true,
                pageMode: 'view',
                pagename: page.title,
                canonical: `/w/${page.title}`,
                updatedAt: page.updatedAt,
                titleInfo: titleSuffix || null,
                redirectFrom: req.query.from || null
            })
        } else {
            if (/User:.*?/igm.test(name)) {
                const isOwnPage = name.split(':')[1] == req.session.username
                return res.status(404).json({
                    error: true,
                    i18nKey: isOwnPage ? 'noUserPage_user' : 'noUserPage',
                    pagename: name
                })
            }

            const existingPage = await repositories.pages.findByTitle(name)
            return res.status(404).json({
                error: true,
                i18nKey: 'page404',
                pagename: name,
                hasHistory: !!existingPage
            })
        }
    } else {
        const page = await services.page.getPage(name, {
            rev,
            user: req.session.username,
            ipAddress: req.ipAddress
        })

        const opt = await getOptions(page.content)
        let { html: content } = await services.render.render(
            contentPrefix + page.content,
            { pagename: name, renderSectionEditButton: false },
            repositories,
            false
        )

        const categories = await req.app.locals.services.category.getCategoriesForPage(name)

        return res.json({
            title: page.title,
            content: content,
            categories,
            showCategory: showCategory(page.title, opt['category']),
            canonical: `/w/${page.title}?rev=${rev}`,
            isPage: true,
            pageMode: 'view',
            pagename: page.title,
            titleInfo: titleSuffix || null,
            rev
        })
    }
}
