
import grantHandler from './grant.js'
import blockUserHandler from './blockuser.js'
import blockIpHandler from './blockip.js'
import protectRevisionHandler from './protectRevision.js'
import hideThreadCommentHandler from './hidethreadcomment.js'
import changeThreadStatusHandler from './changethreadstatus.js'
import changeThreadTitleHandler from './changethreadtitle.js'
import gongjiHandler from './gongji.js'

export default async (req, res, users, perm, block, page, protect, adminlog, threadcomment, thread) =>
{
    switch (req.params.name)
    {
        case 'grant':
            await grantHandler(req, res, users, perm, adminlog)
            return
        case 'blockuser':
            await blockUserHandler(req, res, users, perm, block, adminlog)
            return
        case 'blockip':
            await blockIpHandler(req, res, users, perm, block, adminlog)
            return
        case 'hiderev':
            await protectRevisionHandler(req, res, 
                {
                    'perm': perm,
                    'page': page,
                    'protect': protect,
                    'adminlog': adminlog
                })
            return
        case 'hidethread':
            await hideThreadCommentHandler(req, res,
            {
                'perm': perm,
                'threadcomment': threadcomment
            })
            return
        case 'changethreadstatus':
            await changeThreadStatusHandler(req, res,
                {
                    'perm': perm,
                    'thread': thread,
                    'threadcomment': threadcomment
                })
            return
        case 'changethreadname':
            await changeThreadTitleHandler(req, res,
                {
                    'perm': perm,
                    'thread': thread,
                    'threadcomment': threadcomment
                })
            return
        case 'gongji':
            {
                await gongjiHandler(req, res, global.db.gongji)
                return
            }
        default:
            res.writeHead(404)
            res.write('404 Not Found')
            return
    }
}
