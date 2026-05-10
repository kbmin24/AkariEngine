import date from 'date-and-time'
import escapeHtml from '../../utils/escapeHTML.js'
import { renderLayout } from '../../utils/httpHelper.js'
import renderError from '../../utils/error.js'
import { getCategory, getOptions } from '../../utils/wikimark/keywordHelper.js'
import { PageNotFoundError, RevisionNotFoundError } from '../../services/errors.js'

export default async (req, res) => {
    const { services, repositories } = req.app.locals
    const name = req.params.name
    const rev = req.query.rev

    let titleSuffix = ''
    if (rev) titleSuffix = `(r${rev})&nbsp;`

    // if it's an admin user's page add some suffix
    const usernameRegex = /User:(.*)/
    if (usernameRegex.test(name)) {
        const username = usernameRegex.exec(name)[1]
        if (username && await services.permission.hasPermission(username, 'admin')) {
            titleSuffix += `(${res.__('admin')})`
        }
    }

    // include file itself in file page
    let contentPrefix = ''
    if (name.toLowerCase().startsWith('file:')) {
        const filename = /File:(.*)/.exec(name)[1]
        if (/^(.*?\.(?:png|jpg|jpeg|gif|webp|svg))$/gi.test(filename)) {
            contentPrefix = `[file(${filename})]\n`
        } else if (/^(.*?\.pdf)$/gi.test(filename)) {
            contentPrefix = `[file(${filename}|width=100%|height=500px)]\n<a href='/uploads/${filename}'>Download</a>`
        } else {
            contentPrefix = `<p><span class="fw-bold text-danger">${res.__('error')}:</span> ${res.__('file_nobrowser')} <a target='_blank' href="/uploads/${escapeHtml(filename)}">${res.__('file_innewtab')}</a></p>`
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
                titleSuffix = res.__('page_redirectedfrom', { page: `<a href='/w/${escapeHtml(req.query.from)}'>${escapeHtml(req.query.from)}</a>` }) + `&nbsp;` + titleSuffix
            }

            const opt = await getOptions(page.content)
            let { result, html: content } = await services.render.render(
                contentPrefix + page.content,
                { pagename: name, renderSectionEditButton: true },
                repositories,
                redirect
            )

            if (result === 'redirect') {
                return res.redirect(`/w/${content}?redirect=true&from=${encodeURIComponent(name)}`)
            }

            content = (await getCategory(name, repositories.categories, opt['category'])) + content

            const renderOpt = {
                title: page.title,
                content,
                isPage: true,
                pageMode: 'view',
                pagename: page.title,
                canonical: `/w/${page.title}`,
                updatedAt: date.format(page.updatedAt, global.dtFormat),
                username: req.session.username,
                ipaddr: req.ipAddress,
            }
            if (titleSuffix) renderOpt.titleInfo = titleSuffix
            renderLayout(req, res, renderOpt)
        } else {
            if (/User:.*?/igm.test(name)) {
                const content = name.split(':')[1] == req.session.username
                    ? res.__('noUserPage_user', { link: escapeHtml(name) })
                    : res.__('noUserPage')
                renderLayout(req, res, {
                    title: res.__('error'),
                    content,
                    isPage: false,
                    username: req.session.username,
                    ipaddr: req.ipAddress,
                })
                return
            }
            let hisText = ''
            const existingPage = await repositories.pages.findByTitle(name)
            if (existingPage) {
                hisText = res.__('seeHistory', { link: escapeHtml(name) })
            }
            renderError(req, res, {
                description: res.__('noPageMsg', { name: escapeHtml(name), hisText }),
                returnLink: '/',
                returnName: res.__('mainpage'),
                statusCode: 404
            })
        }
    } else {
        try {
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

            content = (await getCategory(name, repositories.categories, opt['category'])) + content

            const renderOpt = {
                title: page.title,
                content,
                canonical: `/w/${page.title}?rev=${rev}`,
                isPage: true,
                pageMode: 'view',
                pagename: page.title,
                username: req.session.username,
                ipaddr: req.ipAddress,
            }
            if (titleSuffix) renderOpt.titleInfo = titleSuffix
            renderLayout(req, res, renderOpt)
        } catch (e) {
            if (e instanceof RevisionNotFoundError) {
                renderError(req, res, {
                    description: res.__('revision404'),
                    returnLink: '/',
                    returnName: res.__('mainpage'),
                    statusCode: 404
                })
            } else if (e instanceof PageNotFoundError) {
                renderError(req, res, {
                    description: res.__('noPageMsg', { name, hisText: '' }),
                    returnLink: '/',
                    returnName: res.__('mainpage'),
                    statusCode: 404
                })
            } else {
                throw e
            }
        }
    }
}
