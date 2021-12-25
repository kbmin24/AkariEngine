const dateandtime = require('date-and-time')

module.exports = async (req, res, users, perm, block, adminlog) =>
{
    const username = req.session.username
    //first check whether the user has block permission or not
    if (!(await perm.findOne({where: {username: username, perm: 'block'}})))
    {
        console.log('[ADMIN] Unauthorised block attempt: ' + username)
        require(global.path + '/error.js')(req, res, null, 'You do not have a block permission', '/admin', 'the admin page')
        return
    }
    
    //secondly check whether the user exists
    const u = users.findOne({where: {username: req.body.target}})
    if (!u)
    {
        await require(global.path + '/error.js')(req, res, null, 'No such user.', '/admin/blockuser', 'blockuser page')
        return
    }

    //thirdly determine the type of task to do
    var description = ''
    switch (req.body.blockfor)
    {
        case 'unblock':
            //todo: find records that the time has passed
            //perm.destroy({where: {username: grantTo}})
            let currentBlock = await block.findOne({where: {target: req.body.target, targetType: 'user'}})
            if (!currentBlock)
            {
                await require(global.path + '/error.js')(req, res, null, 'The user currently is not blocked.', '/admin/blockuser', 'blockuser page')
                return
            }
            await block.destroy({where: {target: req.body.target, targetType: 'user'}})
            description = `unblocked ${req.body.target} - ${req.body.comment}`
            break
        case 'forever':
            let currentBlock = await block.findOne({where: {target: req.body.target, targetType: 'user'}})
            if (currentBlock)
            {
                await require(global.path + '/error.js')(req, res, null, 'The user is already blocked. Please unblock the user first.', '/admin/blockuser', 'blockuser page')
                return
            }
            await block.create({
                target: req.body.target,
                targetType: 'user',
                isForever: true,
                doneBy: username,
                comment: req.body.comment
            })
            description = `blocked ${req.body.target} forever - ${req.body.comment}`
            break
        default:
            //other periods
            if (isNaN(req.body.blockfor))
            {
                await require(global.path + '/error.js')(req, res, null, 'Block period must be unblock, forever or an integer.', '/admin/blockuser', 'blockuser page')
                return
            }
            let currentBlock = await block.findOne({where: {target: req.body.target, targetType: 'user'}})
            if (currentBlock)
            {
                await require(global.path + '/error.js')(req, res, null, 'The user is already blocked. Please unblock the user first.', '/admin/blockuser', 'blockuser page')
                return
            }
            const blockTill = new Date(Date.now() + req.body.blockfor * 1000)
            await block.create({
                target: req.body.target,
                targetType: 'user',
                isForever: false,
                doneBy: username,
                until: blockTill,
                comment: req.body.comment
            })
            description = `blocked ${req.body.target} until ${dateandtime.format(blockTill, global.dtFormat)} - ${req.body.comment}`
            break

    }
    adminlog.create({
        username: username,
        job: description
    })
    require(global.path + '/info.js')(req, res, null, 'Done.', '/admin', 'the admin page')
}