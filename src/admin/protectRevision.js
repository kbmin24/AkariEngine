
import renderError from '../utils/error.js'
import renderInfo from '../info.js'

export default async (req, res, tables={}) =>
{
    const username = req.session.username
    const title = req.body.pagename
    const level = req.body.level
    if (isNaN(req.body.rev))
    {
        await renderError(req, res, { description: 'rev must be a number.', returnLink: 'javascript:window.history.back()', returnName: 'the previous page' })
        return
    }
    const rev = req.body.rev * 1
    if (!username)
    {
        await renderError(req, res, { description: '로그인이 필요합니다.', returnLink: '/login', returnName: '로그인 페이지', statusCode: 404 })
        return
    }
    if (!(await tables['perm'].findOne({where:{username: username, perm: 'acl'}})))
    {
        await renderError(req, res, { description: 'You need ACL permission.', returnLink: '/', returnName: 'the main page' })
        return
    }

    const page = await tables['page'].findOne({where: {title: title}})
    if (!page)
    {
        await renderError(req, res, { description: 'No such page.', returnLink: 'javascript:window.history.back()', returnName: 'the previous page' })
        return
    }
    //ensure that that r actually exists
    //that is:
    //1 <= rev AND rev <= page.currentRev
    if (rev < 1 || page.currentRev < rev)
    {
        await renderError(req, res, { description: 'No such revision.', returnLink: 'javascript:window.history.back()', returnName: 'the previous page' })
        return
    }

    //destroy existing ACL
    await tables['protect'].destroy({where: {title: title, revision: rev}})
    await tables['protect'].create(
        {
            title: title,
            task: 'read',
            revision: rev,
            protectionLevel: level
        }
    )
    await tables['adminlog'].create(
        {
            username: username,
            job: `protected ${title} r${rev} to ${level}`
        }
    )
    renderInfo(req, res, { description: 'Done.', returnLink: '/admin', returnName: 'the admin page' })
}
