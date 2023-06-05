function regCategory(title, content, category)
{
    /*
        Algorithm:
        1. erase all
        2. insert all found ones
        Time Complexity: O(P+N+K) (P: Length of page, N: # of records in the table, K: # to register)
    */
    //erase existing categories
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


module.exports = async (req, res, username, users, pages, recentchanges, history, thread, perm, block, protect, category) =>
{
    if (req.params.name.toLowerCase().startsWith('file:'))
    {
        require(global.path + '/error.js')(req, res, null, `파일 문서는 이동할 수 없습니다.`, '/', '메인 페이지', 200, 'ko')
        return
    }
    
    if (!(await require(global.path + '/tools/captcha.js').chkCaptcha(req, res, perm))) return

    //check for protection 
    const pro = await protect.findOne({where: {title: req.params.name, task: 'move'}})
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
        require(global.path + '/error.js')(req, res, null, `문서의 이동 권한이 ${acl}이기 때문에 이동할 수 없습니다.`, '/login', '로그인 페이지', 403, 'ko')
        return
    }
    pages.findOne({where: {title: req.body.newName}}).then(async oldpage =>
    {
        var doneby = req.session.username
        if (doneby === undefined) doneby = req.headers['x-forwarded-for'] || req.socket.remoteAddress
        if (oldpage) //if page exists
        {
            require(global.path + '/error.js')(req, res, null, `문서가 이미 존재하기 때문에 이동할 수 없습니다.`, '/', '메인 페이지', 200, 'ko')
        }
        else
        {
            pages.findOne({where: {title: req.params.name}}).then(async page =>
            {
                if (!page)
                {
                    require(global.path + '/error.js')(req, res, null, `잘못된 접근입니다.`, '/', '메인 페이지', 200, 'ko')
                    return
                }
                //move protects
                let ps = await protect.findAll({where: {title: req.params.name}})
                ps.forEach(async v =>
                    {
                        v.update({title: req.body.newName})
                    })
                page.update({title: req.body.newName, currentRev: page.currentRev + 1})
                .then(() =>
                {
                    //create redirect
                    let redrPageContent = `#redirect ${req.body.newName}`
                    pages.create(
                    {
                        title: req.params.name,
                        content: redrPageContent,
                        currentRev: 1
                    })
                    history.create(
                    {
                        page: req.params.name,
                        rev: 1,
                        content: redrPageContent,
                        bytechange: redrPageContent.length,
                        editedby: doneby,
                        comment: `문서 이동으로 인해 자동 생성`,
                        type: 'create'
                    })
                    recentchanges.create(
                    {
                        page: req.params.name,
                        rev: 1,
                        doneBy: doneby,
                        comment: `문서 이동으로 인해 자동 생성`,
                        bytechange: redrPageContent.length,
                        type: 'create'
                    })

                    //category
                    category.destroy({where: {page: req.params.name}})
                    regCategory(req.body.newName, page.content, category)
                    
                    //deal with the main page
                    recentchanges.create(
                    {
                        page: req.body.newName,
                        rev: page.currentRev,
                        doneBy: doneby,
                        bytechange: 0,
                        comment: req.params.name + '을(를) ' + req.body.newName + '로 이동',
                        type: 'move'
                    })
                    history.findAll({where: {page: req.params.name}}).then(oldhistories =>
                    {
                        for (var i = 0; i < oldhistories.length; i++)
                        {
                            oldhistories[i].update(
                            {
                                page: req.body.newName
                            })
                        }
                    })
                    thread.findAll({where: {pagename: req.params.name}}).then(oldthreads =>
                        {
                            oldthreads.forEach(o =>
                                {
                                    o.update({pagename: req.body.newName})
                                })
                        })
                    history.create(
                    {
                        page: req.body.newName,
                        rev: page.currentRev,
                        content: page.content,
                        bytechange: 0,
                        editedby: doneby,
                        movedFrom: req.params.name,
                        movedTo: req.body.newName,
                        comment: req.params.name + '을(를) ' + req.body.newName + '로 이동',
                        type: 'move'
                    })
                    res.redirect('/w/' + req.body.newName)
                })
            })
        }
    })
}