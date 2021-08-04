async function getCategory(title, category, categorys)
{
    let categorySwitch = /User:.*/.test(title) ? (categorys == 'on') : !(categorys == 'off')
    const categories = await category.findAll({where: {page: title}})

    const cardBeginning = `<div class='card mb-2'><div class='card-body'>Categories: `
    const cardEnd = `</div></div>`

    if (categories.length == 0)
    {
        if (!categorySwitch) return '' //we don't need category for user page
        return cardBeginning + '<i>None</i>' + cardEnd
    }

    var res = cardBeginning

    categories.forEach((c, i) =>
    {
        res += `<a href='/category/${c.category.replace(`'`,`&apos;`)}'>${c.category}</a> `
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
exports.getCategory = async (title, category, categorys) => await getCategory(title, category, categorys)
exports.getOptions = async content => await getOptions(content)
module.exports = async (req, res, pages, history, protect, perm, block, category, viewcount, updateTime) =>
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
        require(global.path + '/error.js')(req, res, username, 'You cannot view because the protection level for this page is ' + acl + '.', '/', 'the main page')
        return
    }

    let titleSuffix = ''
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
                titleSuffix += '(<i>admin</i>)'
            }
        }
    }
    if (rev === undefined)
    {
        //get the newest ver.
        await pages.findOne({where: {title: req.params.name}}).then(async page =>
        {
            if (page) //if page exists
            {
                await updViewCount(req.params.name, viewcount, updateTime)
                //show the page
                const redirect = !(req.query.redirect == 'true' || req.query.from)
                if (req.query.from)
                {
                    titleSuffix = `<i>redirected from <a href='/w/${req.query.from}?redirect=true'>${req.query.from}</a></i>&nbsp;` + titleSuffix
                }
                let opt = await getOptions(page.content)
                let content = await require(global.path + '/pages/render.js')(req.params.name, page.content, true, pages, req, res, redirect, true, {}, opt)
                if (content === undefined) return
                content = await getCategory(req.params.name, category, opt['category']) + content
                let renderOpt = {
                    title: page.title,
                    content: content,
                    isPage: true,
                    pagename: page.title,
                    username: req.session.username,
                    wikiname: global.appname
                }
                if (titleSuffix != '') renderOpt['titleInfo'] = titleSuffix
                res.render('outline',renderOpt)
            }
            else
            {
                //404!
                require(global.path + '/error.js')(req, res, null, 'The page requested is not found. Would you like to <a href="/edit/'+req.params.name+'">create one?</a>', '/', 'the main page', code=404)
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
                //(pagename, data, renderInclude, pages = undefined, req = undefined, res = undefined, redirect = true, incl=true, args={})
                let content = await require(global.path + '/pages/render.js')(req.params.name, page.content, true, pages, req, res, false, true, {}, await getOptions(page.content))
                if (content === undefined) return
                let renderOpt = {
                    title: page.page,
                    content: content,
                    isPage: true,
                    pagename: page.page,
                    username: req.session.username,
                    wikiname: global.appname
                }
                if (titleSuffix != '') renderOpt['titleInfo'] = titleSuffix
                res.render('outline', renderOpt)
            }
            else
            {
                require(global.path + '/error.js')(req, res, null, 'The page requested is not found. Would you like to <a href="/edit/'+req.params.name+'">create one?</a>', '/', 'the main page', code=404)
            }
        })
    }
}