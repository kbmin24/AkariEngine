const paths = require('../utils/paths')

module.exports = async (req, res, users, perm, block, page, protect, adminlog, threadcomment, thread) =>
{
    switch (req.params.name)
    {
        case 'grant':
            await require(paths.resolve('admin', 'grant.js'))(req, res, users, perm, adminlog)
            return
        case 'blockuser':
            await require(paths.resolve('admin', 'blockuser.js'))(req, res, users, perm, block, adminlog)
            return
        case 'blockip':
            await require(paths.resolve('admin', 'blockip.js'))(req, res, users, perm, block, adminlog)
            return
        case 'hiderev':
            await require(paths.resolve('admin', 'protectRevision.js'))(req, res, 
                {
                    'perm': perm,
                    'page': page,
                    'protect': protect,
                    'adminlog': adminlog
                })
            return
        case 'hidethread':
            await require(paths.resolve('admin', 'hidethreadcomment.js'))(req, res,
            {
                'perm': perm,
                'threadcomment': threadcomment
            })
            return
        case 'changethreadstatus':
            await require(paths.resolve('admin', 'changethreadstatus.js'))(req, res,
                {
                    'perm': perm,
                    'thread': thread,
                    'threadcomment': threadcomment
                })
            return
        case 'changethreadname':
            await require(paths.resolve('admin', 'changethreadtitle.js'))(req, res,
                {
                    'perm': perm,
                    'thread': thread,
                    'threadcomment': threadcomment
                })
            return
        case 'gongji':
            {
                await require(paths.resolve('admin', 'gongji.js'))(req, res, global.db.gongji)
                return
            }
        default:
            res.writeHead(404)
            res.write('404 Not Found')
            return
    }
}
