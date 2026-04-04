import date from 'date-and-time'
import i18n from 'i18n'
import escapeHtml from '../utils/escapeHTML.js'
import renderView from '../view.js'
import renderError from '../utils/error.js'
import {
    PageNotFoundError,
    RevisionNotFoundError,
} from '../services/errors.js'


// TODO refactor to use PageService

export async function getCategory(title, category, categorys) {
    let categorySwitch = /User:.*/.test(title) ? (categorys == 'on') : (categorys != 'off')
    const categories = await category.findAll({ where: { page: title } })

    const cardBeginning = `<div class='category'>${i18n.__('category')}: `
    const cardEnd = `</div>`

    if (categories.length == 0) {
        if (!categorySwitch) return '' //we don't need empty category for user page
        return cardBeginning + i18n.__('none') + cardEnd
    }

    var res = cardBeginning

    categories.forEach((c, i) => {
        res += `<a href='/category/${c.category.replace(/'/g, `&apos;`)}'>${c.category}</a> `
        if (i < categories.length - 1) res += '| '
    })
    res += cardEnd
    return res
}

export async function getOptions(content) {
    let res = {}
    let regRes = /^((?:Option \w+ \w+\r?\n)+)/ig.exec(content)
    if (!regRes || regRes.length < 2) return {}
    let options = regRes[1]
    if (!options) return res //blank
    options.split('\n').forEach((option) => {
        if (option == '') return
        const sp = option.split(' ')
        res[sp[1].toLowerCase()] = sp[2].replace('\r', '').toLowerCase()
    })
    return res
}
async function updViewCount(title, viewcount, updateTime) {
    const u = await updateTime.findOne({ where: { key: 'viewcount' } })
    if (u) {
        if (u.value.getDate() != (new Date()).getDate()) {
            //wipe out
            await viewcount.destroy({ where: {}, truncate: true })
            await u.update({ value: new Date() })
        }
    }
    else {
        await updateTime.create(
            {
                key: 'viewcount',
                value: new Date()
            }
        )
    }
    const p = await viewcount.findOne({ where: { title: title } })
    if (p) p.update({ count: p.count + 1 })
    else viewcount.create({ title: title, count: 1 })
}

export default async (req, res) => {
    const repositories = req.app.locals.repositories
    const pagesRepo = repositories.pages
    const permissionRepo = repositories.permissions
    const categoryRepo = repositories.categories
    const viewcountModel = global.db.viewcount
    const updateTimeModel = global.db.updateTime
    const pageService = req.app.locals.services.page

    //check read ACL
    req.params.name = req.params.name.trim()
    var rev = req.query.rev

    let titleSuffix = ''
    let contentPrefix = ''
    //check if it's a user page AND it's an admin's one
    if (rev) titleSuffix = `(r${rev})&nbsp;`
    const usernameRegex = /User:(.*)/
    if (usernameRegex.test(req.params.name)) {
        const username = usernameRegex.exec(req.params.name)[1]
        if (username) {
            if (await permissionRepo.hasPermission(username, 'admin')) {
                titleSuffix += `(${i18n.__('admin')})`
            }
        }
    }
    if (req.params.name.toLowerCase().startsWith('file:')) {
        const filename = /File:(.*)/.exec(req.params.name)[1]
        if (/^(.*?\.(?:png|jpg|jpeg|gif|webp|svg))$/gi.test(filename)) {
            contentPrefix = `[file(${filename})]\n`
        }
        else if (/^(.*?\.pdf)$/gi.test(filename)) {
            contentPrefix = `[file(${filename}|width=100%|height=500px)]\n<a href='/uploads/${filename}'>Download</a>`
        }
        else {
            contentPrefix = `<p><span class="fw-bold text-danger">${i18n.__('error')}:</span> ${i18n.__('file_nobrowser')} <a target='_blank' href="/uploads/${escapeHtml(filename)}">${i18n.__('file_innewtab')}</a></p>`
        }

    }

    if (rev === undefined) {
        //get the newest ver.
        let page = null
        try {
            page = await pageService.getPage(req.params.name, {
                user: req.session.username,
                ipAddress: req.ipAddress
            })
        } catch (e) {
            if (!(e instanceof PageNotFoundError)) throw e
        }

        await (async () => {
            if (page && !page.deleted) //if page exists
            {
                await updViewCount(req.params.name, viewcountModel, updateTimeModel)
                //show the page
                const redirect = !(req.query.redirect == 'true' || req.query.from)
                if (req.query.from) {
                    titleSuffix = i18n.__('page_redirectedfrom', { page: `<a href='/w/${escapeHtml(req.query.from)}'>${escapeHtml(req.query.from)}</a>` }), `&nbsp;` + titleSuffix
                }

                let opt = await getOptions(page.content)

                let { result, html: content } = await req.app.locals.services.render.render(contentPrefix + page.content,
                    { pagename: req.params.name, renderSectionEditButton: true },
                    req.app.locals.repositories,
                    redirect)

                if (result === 'redirect') {
                    return res.redirect(`/w/${content}?redirect=true&from=${encodeURIComponent(req.params.name)}`)
                }

                content = (await getCategory(req.params.name, categoryRepo, opt['category'])) + content
                let renderOpt = {
                    title: page.title,
                    content: content,
                    isPage: true,
                    pageMode: "view",
                    pagename: page.title,
                    canonical: `/w/${page.title}`,
                    updatedAt: date.format(page.updatedAt, global.dtFormat),
                    username: req.session.username,
                    ipaddr: req.ipAddress,

                }
                if (titleSuffix != '') renderOpt['titleInfo'] = titleSuffix
                renderView(req, res, renderOpt)
            }
            else {
                //404!
                //do stuff with user pages
                if (/User:.*?/igm.test(req.params.name)) {
                    let content
                    if (req.params.name.split(':')[1] == req.session.username)
                        content = i18n.__("noUserPage_user", { link: escapeHtml(req.params.name) })
                    else
                        content = i18n.__("noUserPage")
                    renderView(req, res,
                        {
                            title: i18n.__("error"),
                            content: content,
                            isPage: false,
                            username: req.session.username,
                            ipaddr: req.ipAddress,

                        })
                    return
                }
                let hisText = ''
                const existingPage = await pagesRepo.findByTitle(req.params.name)
                if (existingPage) {
                    hisText = i18n.__("seeHistory", { link: escapeHtml(req.params.name) })
                }
                renderError(req, res, {
                    description: i18n.__("noPageMsg",
                        {
                            name: escapeHtml(req.params.name),
                            hisText,
                        }), returnLink: '/', returnName: i18n.__("mainpage"), statusCode: 404
                })
            }
        })()
    }
    else {
        //get the nth revision
        try {
            const page = await pageService.getPage(req.params.name, {
                rev,
                user: req.session.username,
                ipAddress: req.ipAddress
            })

            //show the page
            let opt = await getOptions(page.content)
            let { html: content } = await req.app.locals.services.render.render(contentPrefix + page.content,
                { pagename: req.params.name, renderSectionEditButton: false },
                req.app.locals.repositories,
                false)

            // category
            content = (await getCategory(req.params.name, categoryRepo, opt['category'])) + content

            let renderOpt = {
                title: page.title,
                content: content,
                canonical: `/w/${page.title}?rev=${rev}`,
                isPage: true,
                pageMode: "view",
                pagename: page.title
            }
            if (titleSuffix != '') renderOpt['titleInfo'] = titleSuffix
            renderView(req, res, renderOpt)
        }
        catch (e) {
            if (e instanceof RevisionNotFoundError) {
                renderError(req, res, {
                    description: i18n.__("revision404"),
                    returnLink: '/',
                    returnName: i18n.__("mainpage"),
                    statusCode: 404
                })
                return
            }
            else if (e instanceof PageNotFoundError) {
                renderError(req, res, {
                    description: i18n.__("noPageMsg",
                        {
                            name: req.params.name,
                            hisText: ''
                        }),
                    returnLink: '/', returnName: i18n.__("mainpage"), statusCode: 404
                })
                return
            }
            else {
                throw e
            }
        }
    }
};

