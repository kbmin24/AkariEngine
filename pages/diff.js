import diff2html from 'diff2html'
import { createTwoFilesPatch } from 'diff'
import renderError from '../utils/error.js'
import satisfyAcl from './satisfyACL.js'
import { renderTemplateInLayout } from '../utils/httpHelper.js'
import i18n from 'i18n'

export default async (req, res, history, protect, perm, block) =>
{   
    //check read ACL
    req.params.name = req.params.name.trim()
    const pro = await protect.findOne({where: {title: req.params.name, task: 'read'}})
    var acl = (pro == undefined ? 'blocked' : pro.protectionLevel) //fallback

    //rule: OLD AND NEW
    var rev1 = req.query.rev1
    var rev2 = req.query.rev2
    if (!rev1 || !rev2)
    {
        renderError(req, res, { description: `리비전이 지정되지 않았습니다.`, returnLink: '/', returnName: '메인 페이지', statusCode: 404 })
        return
    }

    if (rev1 * 1 > rev2 * 1) [rev1, rev2] = [rev2, rev1]

    let ACLList = [acl]
    const pro1 = await protect.findOne({where: {title: req.params.name, task: 'read', revision: rev1}})
    const pro2 = await protect.findOne({where: {title: req.params.name, task: 'read', revision: rev2}})
    if (pro1) ACLList.push(pro1.protectionLevel)
    if (pro2) ACLList.push(pro2.protectionLevel)
    const r = await satisfyAcl(req, res, ACLList, perm, block, rev1)
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
        renderError(req, res, { description: '읽기 권한이 ' + acl + '이기 때문에 읽을 수 없습니다.', returnLink: '/login', returnName: '로그인 페이지', statusCode: 403 })
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
        renderError(req, res, { description: `요청하신 문서나 리비전을 찾을 수 없었습니다. <a href="/edit/${req.params.name}">새로 만드시겠습니까?</a>`, returnLink: '/', returnName: '메인 페이지', statusCode: 404 })
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
        renderError(req, res, { description: `요청하신 문서나 리비전을 찾을 수 없었습니다. <a href="/edit/${req.params.name}">새로 만드시겠습니까?</a>`, returnLink: '/', returnName: '메인 페이지', statusCode: 404 })
        return
    }

    // TODO rewrite using EJS
    const cont1 = pagev1.content.replace(/\r\n/, '\n')
    const cont2 = pagev2.content.replace(/\r\n/, '\n')
    const difference = createTwoFilesPatch(`r${rev1}`, `r${rev2}`, cont1, cont2)
    const diffHtml = diff2html.html(difference,
    {
        outputFormat: 'line-by-line',
        drawFileList: false,
        matching: 'lines'
    })

    await renderTemplateInLayout(req, res, 'pages/diff.ejs', {
        diffHtml
    }, {
        title: i18n.__('diffBetweenRevisions', { pagename: req.params.name, rev1, rev2 }),
        isPage: true,
        pagename: pagev1.page,
        username: req.session.username,
        ipaddr: req.ipAddress,
    })

}
