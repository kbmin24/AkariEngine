module.exports = async (req, res, users, perm, block, page, protect, adminlog, threadcomment, thread) =>
{
    const username = req.session.username
    switch (req.params.name)
    {
        case 'grant':
            await require(__dirname + '/grant.js')(req, res, users, perm, adminlog)
            return
        case 'blockuser':
            await require(__dirname + '/blockuser.js')(req, res, users, perm, block, adminlog)
            return
        case 'blockip':
            await require(__dirname + '/blockip.js')(req, res, users, perm, block, adminlog)
            return
        case 'hiderev':
            await require(__dirname + '/protectRevision.js')(req, res, 
                {
                    'perm': perm,
                    'page': page,
                    'protect': protect,
                    'adminlog': adminlog
                })
            return
        case 'hidethread':
            await require(__dirname + '/hidethreadcomment.js')(req, res,
            {
                'perm': perm,
                'threadcomment': threadcomment
            })
            return
        case 'changethreadstatus':
            await require(__dirname + '/changethreadstatus.js')(req, res,
                {
                    'perm': perm,
                    'thread': thread,
                    'threadcomment': threadcomment
                })
            return
        case 'changethreadname':
            await require(__dirname + '/changethreadtitle.js')(req, res,
                {
                    'perm': perm,
                    'thread': thread,
                    'threadcomment': threadcomment
                })
            return
        default:
            res.writeHead(404)
            res.write('404 Not Found')
            return
    }
}