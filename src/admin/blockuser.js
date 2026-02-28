import dateandtime from 'date-and-time'
import logger from '../utils/logger.js'
import renderError from '../utils/error.js'
import renderInfo from '../info.js'

export default async (req, res, users, perm, block, adminlog) =>
{
    const username = req.session.username
    //first check whether the user has block permission or not
    if (!(await perm.findOne({where: {username: username, perm: 'block'}})))
    {
        logger.admin('Unauthorised block attempt', username, { ip: req.ipAddress })
        renderError(req, res, { description: 'You do not have a block permission', returnLink: '/admin', returnName: 'the admin page' })
        return
    }
    
    //secondly check whether the user exists
    const u = users.findOne({where: {username: req.body.target}})
    if (!u)
    {
        await renderError(req, res, { description: 'No such user.', returnLink: '/admin/blockuser', returnName: 'blockuser page' })
        return
    }

    //thirdly determine the type of task to do
    var description
    switch (req.body.blockfor)
    {
        case 'unblock':
            {
                let currentBlock = await block.findOne({where: {target: req.body.target, targetType: 'user'}})
                if (!currentBlock)
                {
                    await renderError(req, res, { description: 'The user currently is not blocked.', returnLink: '/admin/blockuser', returnName: 'blockuser page' })
                    return
                }
                await block.destroy({where: {target: req.body.target, targetType: 'user'}})
                description = `unblocked ${req.body.target} - ${req.body.comment}`
                break
            }
        case 'forever':
            {
                let currentBlock = await block.findOne({where: {target: req.body.target, targetType: 'user'}})
                if (currentBlock)
                {
                    await renderError(req, res, { description: 'The user is already blocked. Please unblock the user first.', returnLink: '/admin/blockuser', returnName: 'blockuser page' })
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
            }
        default:
            {
                //other periods
                if (isNaN(req.body.blockfor))
                {
                    await renderError(req, res, { description: 'Block period must be unblock, forever or an integer.', returnLink: '/admin/blockuser', returnName: 'blockuser page' })
                    return
                }
                let currentBlock = await block.findOne({where: {target: req.body.target, targetType: 'user'}})
                if (currentBlock)
                {
                    await renderError(req, res, { description: 'The user is already blocked. Please unblock the user first.', returnLink: '/admin/blockuser', returnName: 'blockuser page' })
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
    }
    adminlog.create({
        username: username,
        job: description
    })
    renderInfo(req, res, null, 'Done.', '/admin', 'the admin page')
}
