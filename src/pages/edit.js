const date = require('date-and-time')
async function sign(req, settings)
{
    const dtnow = date.format(new Date(), global.dtFormat)
    if (req.session.username)
    {
        const s = await settings.findOne({
            where:
            {
                user: req.session.username,
                key: 'sign'
            }
        })
        const prefix = s ? s.value : `[[User:${req.session.username}]]`
        return `${prefix} ${dtnow}`
    }
    else
    {
        return `${req.headers['x-forwarded-for'] || req.socket.remoteAddress} ${dtnow}`
    }
}

async function signAsync(req, str, regex, settings)
{
    //https://stackoverflow.com/questions/33631041/javascript-async-await-in-replace
    const promises = []
    // eslint-disable-next-line no-unused-vars
    str.replace(regex, (match, offset, string, groups) =>
    {
        const promise = sign(req, settings)
        promises.push(promise)
    })
    const data = await Promise.all(promises)
    return str.replace(regex, () => data.shift())
}

async function regCategory(title, content, category)
{
    /*
        Algorithm:
        1. erase all
        2. insert all found ones
        Time Complexity: O(P+N+K) (P: Length of page, N: # of records in the table, K: # to register)
    */
    //erase existing categories
    await category.destroy({where: {page: title}})

    const categoryRegex = /\[\[(?:Category|분류):(.*?)\]\]/igm
    let e
    while ((e = categoryRegex.exec(content)) !== null)
    {
        if (!e[1]) continue
        category.create(
            {
                page: title,
                category: e[1]
            }
        )
    }
}

async function regLink(title, content)
{
    //delete existing links
    await global.db.links.destroy({
        where: {source: title}
    })
    let res = []
    let found = new Set()
    {
        let r = /\[\[([^|\r\n]*?)\]\]/igm
        content = content.replace(r, (_match, p1, _offset, _string, _groups) =>
        {
            if (p1.toLowerCase().startsWith('category') ||
            p1.toLowerCase().startsWith('분류') ||
            p1.toLowerCase().startsWith('http://') ||
            p1.toLowerCase().startsWith('https://'))
                return ''
            if (found.has(p1)) return ''

            found.add(p1)

            res.push({source: title, dest: p1})

            return ''
        })
    }

    //w separate label
    {
        let r = /\[\[(.*?)\|(.*?)\]\]/igm
        content = content.replace(r, (_match, p1, _offset, _string, _groups) =>
        {
            if (p1.toLowerCase().startsWith('category') ||
            p1.toLowerCase().startsWith('분류') ||
            p1.toLowerCase().startsWith('http://') ||
            p1.toLowerCase().startsWith('https://'))
                return ''
            if (found.has(p1)) return ''

            found.add(p1)

            res.push({source: title, dest: p1})

            return ''
        })
    }
    await global.db.links.bulkCreate(res)
}

module.exports = async (req, res, username, users, pages, recentchanges, history, protect, perm, block, category, settings) =>
{

    //check CAPTCHA
    let captchaSuccess = await require(global.path + '/tools/captcha.js').chkCaptcha(req, res, perm)
    if (!captchaSuccess) return //CAPTCHA error

    if (!req.params.name)
    {
        require(global.path + '/error.js')(req, res, null, global.i18n.__('edit_titleneeded'), '/', global.i18n.__('mainpage'), 200)
        return
    }
    if (!req.body.content)
    {
        require(global.path + '/error.js')(req, res, null, global.i18n.__('edit_titleneeded'), '/', global.i18n.__('mainpage'), 200)
        return
    }
    
    if (!req.body.content.endsWith('\n')) req.body.content += '\n'
    req.body.content = req.body.editPrefix + req.body.content + req.body.editSuffix
    req.body.content = req.body.content.replace(/\r/g, '')
    //sign
    req.body.content = await signAsync(req, req.body.content, /~~~~/igm, settings)


    await pages.findOne({where: {title: req.params.name}}).then(async page =>
    {
        //category
        await regCategory(req.params.name, req.body.content, category)

        //xref
        await regLink(req.params.name, req.body.content)

        var doneby = req.session.username
        if (doneby === undefined) doneby = req.headers['x-forwarded-for'] || req.socket.remoteAddress

        //check for protection 
        const pro = await protect.findOne({where: {title: req.params.name, task: 'edit'}})
        var acl = (pro == undefined ? 'everyone' : pro.protectionLevel) //fallback
        const r = await require(global.path + '/pages/satisfyACL.js')(req, res, [acl], perm, block)
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
            require(global.path + '/error.js')(req, res, null, global.i18n.__('edit_noacl', {acl: acl}), '/', global.i18n.__('mainpage'), 403)
            return
        }

        if (page) //if page exists
        {
            const oldLength = page.content.length
            page.update({content: req.body.content, deleted: false, currentRev: page.currentRev + 1})
            .then(() =>
            {
                recentchanges.create(
                {
                    page: req.params.name,
                    rev: page.currentRev,
                    doneBy: doneby,
                    bytechange: req.body.content.length - oldLength,
                    comment: req.body.comment,
                    type: 'edit'
                })
                history.create(
                {
                    page: req.params.name,
                    rev: page.currentRev,
                    content: req.body.content,
                    bytechange: req.body.content.length - oldLength,
                    editedby: doneby,
                    comment: req.body.comment,
                    type: 'edit'
                })
                res.redirect('/w/' + req.params.name)
            })
        }
        else
        {
            if (req.params.name.toLowerCase().startsWith('file:'))
            {
                require(global.path + '/error.js')(req, res, null, global.i18n.__('pagename_illegalfile'), '/', global.i18n.__('mainpage'), 200)
                return
            }

            //category
            await regCategory(req.params.name, req.body.content, category)

            //xref
            await regLink(req.params.name, req.body.content)

            //add one
            pages.create(
            {
                title: req.params.name,
                content: req.body.content,
                currentRev: 1,
                deleted: false
            })
            .then(() =>
            {
                recentchanges.create(
                {
                    page: req.params.name,
                    rev: 1,
                    doneBy: doneby,
                    comment: req.body.comment,
                    bytechange: req.body.content.length,
                    type: 'create'
                })
                history.create(
                {
                    page: req.params.name,
                    rev: 1,
                    content: req.body.content,
                    bytechange: req.body.content.length,
                    editedby: doneby,
                    comment: req.body.comment,
                    type: 'create'
                })
                res.redirect('/w/' + req.params.name)
            })
        }
    })
}