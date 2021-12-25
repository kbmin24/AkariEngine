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

    //secondly validate CIDR.
    const CIDRregex = /^([0-9]{1,3}\.){3}[0-9]{1,3}($|\/(1[6-9]|2[0-9]|3[0-2]))$/
    if (!CIDRregex.test(req.body.target))
    {
        await require(global.path + '/error.js')(req, res, null, 'CIDR given is invalid.', '/admin/blockip', 'blockip page')
        return
    }

    //thirdly determine the type of task to do
    var description = ''
    const allowLogin = req.body.allowLogin ? true : false
    switch (req.body.blockfor)
    {
        case 'unblock':
            //todo: find records that the time has passed
            //perm.destroy({where: {username: grantTo}})
            let currentBlock = await block.findOne({where: {target: req.body.target, targetType: 'ip'}})
            if (!currentBlock)
            {
                await require(global.path + '/error.js')(req, res, null, 'The IP currently is not blocked.', '/admin/blockip', 'blockip page')
                return
            }
            await block.destroy({where: {target: req.body.target}})
            description = `unblocked ${req.body.target} - ${req.body.comment}`
            break
        case 'forever':
            let currentBlock = await block.findOne({where: {target: req.body.target, targetType: 'ip'}})
            if (currentBlock)
            {
                await require(global.path + '/error.js')(req, res, null, 'The user is already blocked. Please unblock the user first.', '/admin/blockip', 'blockip page')
                return
            }
            await block.create({
                target: req.body.target,
                targetType: 'ip',
                isForever: true,
                doneBy: username,
                allowLogin: allowLogin,
                comment: req.body.comment
            })
            description = `blocked ${req.body.target} forever (Login: ${allowLogin ? 'Allow': 'Disallow'}) - ${req.body.comment}`
            break
        default:
            //other periods
            if (isNaN(req.body.blockfor))
            {
                await require(global.path + '/error.js')(req, res, null, 'Block period must be unblock, forever or an integer.', '/admin/blockip', 'blockip page')
                return
            }
            let currentBlock = await block.findOne({where: {target: req.body.target, targetType: 'ip'}})
            if (currentBlock)
            {
                await require(global.path + '/error.js')(req, res, null, 'The IP is already blocked. Please unblock the IP first.', '/admin/blockip', 'blockip page')
                return
            }
            const blockTill = new Date(Date.now() + req.body.blockfor * 1000)
            await block.create({
                target: req.body.target,
                targetType: 'ip',
                isForever: false,
                doneBy: username,
                until: blockTill,
                allowLogin: allowLogin,
                comment: req.body.comment
            })
            description = `blocked ${req.body.target} until ${dateandtime.format(blockTill, global.dtFormat)} (Login: ${allowLogin ? 'Allow': 'Disallow'}) - ${req.body.comment}`
            break

    }
    adminlog.create({
        username: username,
        job: description
    })
    require(global.path + '/info.js')(req, res, null, 'Done.', '/admin', 'the admin page')
}