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

module.exports = async (req, res, username, users, pages, recentchanges, history, protect, perm, block) =>
{
    if (!(await require(global.path + '/tools/captcha.js').chkCaptcha(req, res, perm))) return
    
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
        
        require(global.path + '/error.js')(req, res, null, global.i18n.__('move_noacl', {acl: acl}), '/login', global.i18n.__('loginpage'), 403, 'ko')
        return
    }
    pages.findOne({where: {title: decodeURI(req.params.name)}}).then(page =>
    {
        var doneby = req.session.username
        if (doneby === undefined) doneby = req.headers['x-forwarded-for'] || req.socket.remoteAddress
        if (page) //if page exists
        {
            const oldLength = page.content.length
            var oldcontent = undefined
            history.findOne({where: {page: decodeURI(req.params.name), rev: req.body.rev}}).then(oldrev =>
            {
                if (oldrev === undefined)
                {
                    require(global.path + '/error.js')(req, res, null, global.i18n.__('revision404'), '/', global.i18n.__('mainpage'), 404, 'ko')
                    return
                }
                else
                {
                    oldcontent = oldrev.content
                    const comment = 'Revert to r' + req.body.rev + ' - ' + req.body.comment
                    page.update({content: oldcontent, deleted: false, currentRev: page.currentRev + 1})
                    .then(() =>
                    {
                        regLink(req.params.name, oldcontent)
                        recentchanges.create(
                        {
                            page: decodeURI(req.params.name),
                            rev: page.currentRev,
                            doneBy: doneby,
                            bytechange: page.content.length - oldLength,
                            comment: comment,
                            type: 'revert'
                        })
                        history.create(
                        {
                            page: decodeURI(req.params.name),
                            rev: page.currentRev,
                            content: page.content,
                            bytechange: page.content.length - oldLength,
                            editedby: doneby,
                            comment: comment,
                            revertTo: req.body.rev,
                            type: 'revert'
                        })
                        res.redirect('/w/' + decodeURI(req.params.name))
                    })
                }
            })
        }
        else
        {
            //error!
            require(global.path + '/error.js')(req, res, null, global.i18n.__('page404'), '/', global.i18n.__('mainpage'), 404, 'ko')
            return
        }
    })
}