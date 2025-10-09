module.exports = async (req, res, users, perm, block, page, protect, adminlog, threadcomment, thread) =>
{
    switch (req.params.name)
    {
        case 'grant':
            await require(global.path + '/admin/grant.js')(req, res, users, perm, adminlog)
            return
        case 'blockuser':
            await require(global.path + '/admin/blockuser.js')(req, res, users, perm, block, adminlog)
            return
        case 'blockip':
            await require(global.path + '/admin/blockip.js')(req, res, users, perm, block, adminlog)
            return
        case 'hiderev':
            await require(global.path + '/admin/protectRevision.js')(req, res, 
                {
                    'perm': perm,
                    'page': page,
                    'protect': protect,
                    'adminlog': adminlog
                })
            return
        case 'hidethread':
            await require(global.path + '/admin/hidethreadcomment.js')(req, res,
            {
                'perm': perm,
                'threadcomment': threadcomment
            })
            return
        case 'changethreadstatus':
            await require(global.path + '/admin/changethreadstatus.js')(req, res,
                {
                    'perm': perm,
                    'thread': thread,
                    'threadcomment': threadcomment
                })
            return
        case 'changethreadname':
            await require(global.path + '/admin/changethreadtitle.js')(req, res,
                {
                    'perm': perm,
                    'thread': thread,
                    'threadcomment': threadcomment
                })
            return
        case 'gongji':
            {
                await require(global.path + '/admin/gongji.js')(req, res, gongji)
                return
            }
        default:
            res.writeHead(404)
            res.write('404 Not Found')
            return
    }
}
