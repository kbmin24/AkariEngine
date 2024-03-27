const date = require('date-and-time')
async function getCategory(title, category, categorys)
{
    let categorySwitch = /User:.*/.test(title) ? (categorys == 'on') : (categorys != 'off')
    const categories = await category.findAll({where: {page: title}})

    const cardBeginning = `<div class='category'>${global.i18n.__('category')}: `
    const cardEnd = `</div>`

    if (categories.length == 0)
    {
        if (!categorySwitch) return '' //we don't need category for user page
        return cardBeginning + global.i18n.__('none') + cardEnd
    }

    var res = cardBeginning

    categories.forEach((c, i) =>
    {
        res += `<a href='/category/${c.category.replace(/\'/g,`&apos;`)}'>${c.category}</a> `
        if (i < categories.length - 1) res += '| '
    })
    res += cardEnd
    return res
}

async function getOptions(content)
{
    let res = {}
    let regRes =  /^((?:Option \w+ \w+\r?\n)+)/ig.exec(content)
    if (!regRes || regRes.length < 2) return {}
    let options = regRes[1]
    if (!options) return res //blank
    options.split('\n').forEach((option) =>
    {
        if (option == '') return
        const sp = option.split(' ')
        res[sp[1].toLowerCase()] = sp[2].replace('\r', '').toLowerCase()
    })
    return res
}
async function updViewCount(title, viewcount, updateTime)
{
    const u = await updateTime.findOne({where: {key: 'viewcount'}})
    if (u)
    {
        if (u.value.getDate() != (new Date()).getDate())
        {
            //wipe out
            await viewcount.destroy({where: {}, truncate: true})
            await u.update({value: new Date()})
        }
    }
    else
    {
        await updateTime.create(
            {
                key: 'viewcount',
                value: new Date()
            }
        )
    }
    const p = await viewcount.findOne({where: {title: title}})
    if (p) p.update({count: p.count + 1})
    else viewcount.create({title: title, count: 1})
}
function escapeHtml( text )
{
    //https://lifefun.tistory.com/85
    var map = {
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#039;'
    };
    
    return text.replace(/[&<>"']/g, function(m) { return map[m]; });
}

module.exports = async (req, res, pages, files, history, protect, perm, block, category, viewcount, updateTime) =>
{
    //check read ACL
    req.params.name = req.params.name.trim()
    var rev = req.query.rev
    const pro = await protect.findOne({where: {title: req.params.name, task: 'read'}})
    var acl = (pro == undefined ? 'blocked' : pro.protectionLevel) //fallback
    var username = req.session.username

    let ACLList = [acl]
    if (rev)
    {
        const proRev = await protect.findOne({where: {title: req.params.name, task: 'read', revision: rev}})
        if (proRev)
        {
            ACLList.push(proRev.protectionLevel)
        }
    }

    const r = await require(global.path + '/pages/satisfyACL.js')(req, res, ACLList, perm, block)
    if (r)
    {
        //do nothing
    }
    else if (r === undefined)
    {
        return //error message already given out
    }
    else
    {
        require(global.path + '/error.js')(req, res, null, global.i18n.__('view_noacl', {acl: acl}), '/login', global.i18n.__('loginpage'), 403, 'ko')
        return
    }
    let titleSuffix = ''
    let contentPrefix = ''
    //check if it's a user page AND it's an admin's one
    if (rev) titleSuffix = `(r${rev})&nbsp;`
    const usernameRegex = /User:(.*)/
    if (usernameRegex.test(req.params.name))
    {
        const username = usernameRegex.exec(req.params.name)[1]
        if (username)
        {
            if (await (perm.findOne({where: {username: username, perm: 'admin'}})))
            {
                titleSuffix += `(${global.i18n.__('admin')})`
            }
        }
    }
    if (req.params.name.toLowerCase().startsWith('file:'))
    {
        const filename = /File:(.*)/.exec(req.params.name)[1]
        if (/^(.*?\.(?:png|jpg|jpeg|gif|webp|svg))$/gi.test(filename))
        {
            contentPrefix = `[file(${filename})]\n`
        }
        else if (/^(.*?\.pdf)$/gi.test(filename))
        {
            contentPrefix = `[file(${filename}|width=100%|height=500px)]\n<a href='/uploads/${filename}'>Download</a>`
        }
        else
        {
            contentPrefix = `<p><span class="fw-bold text-danger">${global.i18n.__('error')}:</span> ${global.i18n.__('file_nobrowser')} <a target='_blank' href="/uploads/${escapeHtml(filename)}">${global.i18n.__('file_innewtab')}</a></p>`
        }
        
    }

    if (rev === undefined)
    {
        //get the newest ver.
        await pages.findOne({where: {title: req.params.name}}).then(async page =>
        {
            if (page && !page.deleted) //if page exists
            {
                await updViewCount(req.params.name, viewcount, updateTime)
                //show the page
                const redirect = !(req.query.redirect == 'true' || req.query.from)
                if (req.query.from)
                {
                    titleSuffix = global.i18n.__('page_redirectedfrom', {page: `<a href='/w/${escapeHtml(req.query.from)}'>${escapeHtml(req.query.from)}</a>`}), `&nbsp;` + titleSuffix
                }
                let opt = await getOptions(page.content)
                opt.showSectionEditButton = 'on'
                let content = await require(global.path + '/pages/render.js')(req.params.name, contentPrefix + page.content, true, pages, files, req, res, redirect, true, {}, opt)
                if (content === true) return
                content = await getCategory(req.params.name, category, opt['category']) + content
                let renderOpt = {
                    title: page.title,
                    content: content,
                    isPage: true,
                    pageMode: "view",
                    pagename: page.title,
                    canonical: `/w/${page.title}`,
                    updatedAt: date.format(page.updatedAt, global.dtFormat),
                    username: req.session.username,
                    ipaddr: (req.headers['x-forwarded-for'] || req.socket.remoteAddress),
                    
                }
                if (titleSuffix != '') renderOpt['titleInfo'] = titleSuffix
                require(global.path + '/view.js')(req, res,renderOpt)
            }
            else
            {
                //404!
                //do stuff with user pages
                if (/User\:.*?/igm.test(req.params.name))
                {
                    let content
                    if (req.params.name.split(':')[1] == req.session.username)
                        content = global.i18n.__("noUserPage_user", {link: escapeHtml(req.params.name)})
                    else
                        content = global.i18n.__("noUserPage")
                    require(global.path + '/view.js')(req, res,
                    {
                        title: global.i18n.__("error"),
                        content: content,
                        isPage: false,
                        username: req.session.username,
                        ipaddr: req.headers['x-forwarded-for'] || req.socket.remoteAddress,
                        
                    })
                    return
                }
                let hisText = ''
                if (page)
                {
                    hisText = global.i18n.__("seeHistory", {link: escapeHtml(req.params.name)})
                }
                require(global.path + '/error.js')(req, res, null, global.i18n.__("noPageMsg", {name: escapeHtml(req.params.name), hisText: hisText}), '/', global.i18n.__("mainpage"), 404)
            }
        })
    }
    else
    {
        //get the nth revision
        await history.findOne(
        {
            where:
            {
                page: req.params.name,
                rev: rev
            }
        }
        ).then(async page =>
        {
            if (page)
            {
                //show the page
                let content = await require(global.path + '/pages/render.js')(req.params.name, contentPrefix + page.content, true, pages, files, req, res, false, true, {}, await getOptions(page.content))
                if (content === true) return
                let renderOpt = {
                    title: page.page,
                    content: content,
                    canonical: `/w/${page.page}?rev=${rev}`,
                    isPage: true,
                    pageMode: "view",
                    pagename: page.page,
                    username: req.session.username,
                    ipaddr: (req.headers['x-forwarded-for'] || req.socket.remoteAddress),
                    
                }
                if (titleSuffix != '') renderOpt['titleInfo'] = titleSuffix
                require(global.path + '/view.js')(req, res, renderOpt)
            }
            else
            {
                require(global.path + '/error.js')(req, res, null, global.i18n.__("noPageMsg", {name: escapeHtml(req.params.name), hisText: hisText}), '/', global.i18n.__("mainpage"), 404)
            }
        })
    }
}
module.exports.getCategory = async (title, category, categorys) => await getCategory(title, category, categorys)
module.exports.getOptions = async content => await getOptions(content)