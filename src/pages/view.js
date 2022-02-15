const date = require('date-and-time')
async function getCategory(title, category, categorys)
{
    let categorySwitch = /User:.*/.test(title) ? (categorys == 'on') : (categorys != 'off')
    const categories = await category.findAll({where: {page: title}})

    const cardBeginning = `<div class='category'>분류: `
    const cardEnd = `</div>`

    if (categories.length == 0)
    {
        if (!categorySwitch) return '' //we don't need category for user page
        return cardBeginning + '없음' + cardEnd
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
        require(global.path + '/error.js')(req, res, null, `문서의 열람 권한이 ${acl}이기 때문에 이동할 수 없습니다.`, '/login', '로그인 페이지', 403, 'ko')
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
                titleSuffix += '(관리자)'
            }
        }
    }
    if (req.params.name.toLowerCase().startsWith('file:'))
    {
        const filename = /File:(.*)/.exec(req.params.name)[1]
        contentPrefix = `[file(${filename})]\n`
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
                    titleSuffix = `<i><a href='/w/${req.query.from}?redirect=true'>${req.query.from}</a>에서 넘어옴</i>&nbsp;` + titleSuffix
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
                    pagename: page.title,
                    canonical: `/w/${page.title}`,
                    updatedAt: date.format(page.updatedAt, global.dtFormat),
                    username: req.session.username,
                    ipaddr: (req.headers['x-forwarded-for'] || req.socket.remoteAddress),
                    wikiname: global.appname
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
                        content = `<h3>사용자 문서를 찾을 수 없습니다.</h3><p>하지만, 직접 생성할 수 있습니다!</p><p><a href='/edit/${req.params.name}'>사용자 문서 생성</a></p>`
                    else
                        content = `<h3>사용자 문서를 찾을 수 없습니다.</h3><p>사용자가 사용자 문서를 만들지 않았습니다.</p><p><a href='javascript:window.history.back()'>뒤로가기</a></p>`
                    require(global.path + '/view.js')(req, res,
                    {
                        title: '오류',
                        content: content,
                        isPage: false,
                        username: req.session.username,
                        ipaddr: req.headers['x-forwarded-for'] || req.socket.remoteAddress,
                        wikiname: global.appname
                    })
                    return
                }
                require(global.path + '/error.js')(req, res, null, `요청하신 문서를 찾을 수 없습니다. <a href="/edit/${req.params.name}">새로 만드시겠습니까?</a>`, '/', '메인 페이지', 404, 'ko')
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
                let content = await require(global.path + '/pages/render.js')(req.params.name, contentPrefix + page.content, true, pages, files, req, res, false, true, {}, await getOptions(page.content))
                if (content === true) return
                let renderOpt = {
                    title: page.page,
                    content: content,
                    canonical: `/w/${page.page}?rev=${rev}`,
                    isPage: true,
                    pagename: page.page,
                    username: req.session.username,
                    ipaddr: (req.headers['x-forwarded-for'] || req.socket.remoteAddress),
                    wikiname: global.appname
                }
                if (titleSuffix != '') renderOpt['titleInfo'] = titleSuffix
                require(global.path + '/view.js')(req, res, renderOpt)
            }
            else
            {
                require(global.path + '/error.js')(req, res, null, `요청하신 문서를 찾을 수 없습니다. <a href="/edit/${req.params.name}">새로 만드시겠습니까?</a>`, '/', '메인 페이지', 404, 'ko')
            }
        })
    }
}
module.exports.getCategory = async (title, category, categorys) => await getCategory(title, category, categorys)
module.exports.getOptions = async content => await getOptions(content)