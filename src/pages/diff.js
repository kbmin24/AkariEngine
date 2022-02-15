const diff2html = require('diff2html')
const diff = require('diff')
module.exports = async (req, res, history, protect, perm, block) =>
{   
    //check read ACL
    req.params.name = req.params.name.trim()
    const pro = await protect.findOne({where: {title: req.params.name, task: 'read'}})
    var acl = (pro == undefined ? 'blocked' : pro.protectionLevel) //fallback
    var username = req.session.username

    //rule: OLD AND NEW
    var rev1 = req.query.rev1
    var rev2 = req.query.rev2
    if (!rev1 || !rev2)
    {
        require(global.path + '/error.js')(req, res, null, `리비전이 지정되지 않았습니다.`, '/', '메인 페이지', 404, 'ko')
        return
    }

    if (rev1 * 1 > rev2 * 1) [rev1, rev2] = [rev2, rev1]

    let ACLList = [acl]
    const pro1 = await protect.findOne({where: {title: req.params.name, task: 'read', revision: rev1}})
    const pro2 = await protect.findOne({where: {title: req.params.name, task: 'read', revision: rev2}})
    if (pro1) ACLList.push(pro1.protectionLevel)
    if (pro2) ACLList.push(pro2.protectionLevel)
    const r = await require(global.path + '/pages/satisfyACL.js')(req, res, ACLList, perm, block, rev1)
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
        require(global.path + '/error.js')(req, res, null, '읽기 권한이 ' + acl + '이기 때문에 읽을 수 없습니다.', '/login', '로그인 페이지', 403, 'ko')
        return
    }

    const pagev1 = await history.findOne(
    {
        where:
        {
            page: req.params.name,
            rev: rev1
        }
    })
    if (!pagev1)
    {
        require(global.path + '/error.js')(req, res, null, `요청하신 문서나 리비전을 찾을 수 없었습니다. <a href="/edit/${req.params.name}">새로 만드시겠습니까?</a>`, '/', '메인 페이지', 404, 'ko')
        return
    }

    const pagev2 = await history.findOne(
    {
        where:
        {
            page: req.params.name,
            rev: rev2
        }
    })
    if (!pagev2)
    {
        require(global.path + '/error.js')(req, res, null, `요청하신 문서나 리비전을 찾을 수 없었습니다. <a href="/edit/${req.params.name}">새로 만드시겠습니까?</a>`, '/', '메인 페이지', 404, 'ko')
        return
    }

    //const cont1 = sanitiseHtml(pagev1.content, {allowedTags: [], allowedAttributes: {}, disallowedTagsMode: escape})
    //const cont2 = sanitiseHtml(pagev2.content, {allowedTags: [], allowedAttributes: {}, disallowedTagsMode: escape})
    const cont1 = pagev1.content.replace(/\r\n/, '\n')
    const cont2 = pagev2.content.replace(/\r\n/, '\n')
    const difference = diff.createTwoFilesPatch(`r${rev1}`, `r${rev2}`, cont1, cont2)
    var html = diff2html.html(difference,
    {
        outputFormat: 'line-by-line',
        drawFileList: false,
        matching: 'lines'
    })
    html += '<link rel="stylesheet" type="text/css" href="/lib/diff/diff2html.min.css" />'
    html += '<script type="text/javascript" src="/lib/diff/diff2html.min.js"></script>'
    html += '<style>.d2h-moved-tag{display: none;}</style>'
    //var html = ''
    
    //html = await ejs.renderFile(global.path + '/views/pages/diff.ejs',{})
    
    /*
    const diffResult = diff.diffChars(pagev1.content, pagev2.content)
    //https://www.npmjs.com/package/diff
    diffResult.forEach(part =>
    {
        const color = part.added ? 'text-success' : part.removed ? 'text-danger' : 'text-muted'
        html += `<span class='${color}'>${part.value}</span>`
    })
    html = sanitiseHtml(html, {allowedTags: ['span'], allowedAttributes: {'span': ['class']}, disallowedTagsMode: escape})
    html = html.replace(/\r?\n/igm, '<br>')
    html = `<div class='conatiner w-auto bg-light justify-content-center border rounded' style='display: inline-block;'>
    <!-- <div class='row'><div class='col m-2'>Key</div></div> -->
    <div class='row'><div class='col m-2'><span class='text-success'>green</span>: Added in r${rev2}</div></div>
    <div class='row'><div class='col m-2'><span class='text-muted'>grey</span>: No Change</div></div>
    <div class='row'><div class='col m-2'><span class='text-danger'>red</span>: Removed in r${rev2}</div></div>
    </div><br><br>` + html
    */
    require(global.path + '/view.js')(req, res,
    {
        title: `${req.params.name} r${rev1}, r${rev2} 비교`,
        content: html,
        isPage: true,
        pagename: pagev1.page,
        username: req.session.username,
        ipaddr: (req.headers['x-forwarded-for'] || req.socket.remoteAddress),
        wikiname: global.appname
    })        

}