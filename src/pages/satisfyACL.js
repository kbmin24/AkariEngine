const {Op} = require('sequelize')
const dateandtime = require('date-and-time')
const ipRangeCheck = require('ip-range-check')

module.exports = async (req, res, ACL, perms, block, autoredirect=true, editErrorMsg=false) =>
{
    const username = req.session.username
    //remove any 'old' blocks
    await block.destroy(
        {
            where: {
                isForever: false,
                until: {[Op.lt]: new Date()}
            }
        }
    )

    const notLoggedin = username === undefined && !(ACL == 'login' || ACL == 'everyone' || ACL == 'blocked')
    if (notLoggedin && !editErrorMsg)
    {
        if (autoredirect)
        {
            require(global.path + '/error.js')(req, res, null, 'Please login.', '/login', 'the login page')
            return undefined
        }
        else
        {
            return false
        }
    }
    
    //Check for ip
    if (ACL !== 'blocked')
    {
        //Loop Thru every IP blocks
        const ipBlocks = await block.findAll({where: {targetType: 'ip'}})
        let isBlocked = false
        let b
        for (val of ipBlocks)
        {
            //we don't care if the user is logged in and the block allows login
            if (val.allowLogin && username) continue
            let newBlock = ipRangeCheck(req.headers['x-forwarded-for'] || req.socket.remoteAddress, val.target) //does this entry satisfy the user?
            isBlocked = isBlocked || newBlock
            if (isBlocked)
            {
                b = val
                break
            }
        }
        if (isBlocked)
        {
            if (editErrorMsg)
            {
                if (b.isForever)
                {
                    return `Your ip address or its range (${b.target}) is blocked forever by ${b.doneBy} - ${b.comment}`
                }
                else
                {
                    return `Your ip address or its range (${b.target}) is blocked until ${dateandtime.format(b.until, global.dtFormat)} by ${b.doneBy} - ${b.comment}`
                }
            }
            else return false
        }
    }
    switch (ACL)
    {
        case 'admin':
            if (username === undefined) return false
            const permsU = await perms.findAll({where: {username: username}})
            var isAdmin = false
            permsU.forEach((v) =>
            {
                isAdmin = isAdmin || (v.perm == 'admin')
            })
            return isAdmin
        case 'grant':
            if (username === undefined) return false
            const p = await perms.findAll({where: {username: username}})
            var isAdmin = false
            p.forEach((v) =>
            {
                isAdmin = isAdmin || (v.perm == 'grant')
            })
            return isAdmin
        case 'acl':
            if (username === undefined) return false
            const permsACL = await perms.findAll({where: {username: username}})
            var isAdmin = false
            permsACL.forEach((v) =>
            {
                isAdmin = isAdmin || (v.perm == 'acl')
            })
            return isAdmin
        //GROUPS
        case 'login':
            if (editErrorMsg)
            {
                if (username === undefined)
                {
                    return `You need to be logged in in order to edit this page.`
                }
                else
                {
                    const b = await block.findOne({where: {target: username}})
                    if (b)
                    {
                        if (editErrorMsg)
                        {
                            if (b.isForever)
                            {
                                return `You are blocked forever by ${b.doneBy} - ${b.comment}`
                            }
                            else
                            {
                                console.log(b.until)
                                return `You are blocked until ${dateandtime.format(b.until, global.dtFormat)} by ${b.doneBy} - ${b.comment}`
                            }
                        }
                        else return false
                    }
                    else return true
                }
            }
            else return username !== undefined
        case 'everyone':
            if (username)
            {
                const b = await block.findOne({where: {target: username, targetType: 'user'}})
                if (b)
                {
                    if (editErrorMsg)
                    {
                        if (b.isForever)
                        {
                            return `You are blocked forever by ${b.doneBy} - ${b.comment}`
                        }
                        else
                        {
                            return `You are blocked until ${dateandtime.format(b.until, global.dtFormat)} by ${b.doneBy} - ${b.comment}`
                        }
                    }
                    else return false
                }
                else return true
            }
            else return true //ip block is already checked
        case 'blocked':
            return true
    }
}