const {Op} = require('sequelize')
const dateandtime = require('date-and-time')
const ipRangeCheck = require('ip-range-check')

module.exports = async (req, res, ACLs, perms, block, autoredirect=true, editErrorMsg=false) =>
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
    for (let i = 0; i < ACLs.length; i++)
    {
        let ACL = ACLs[i]
        const notLoggedin = username === undefined && !(ACL == 'login' || ACL == 'everyone' || ACL == 'blocked')
        if (notLoggedin && !editErrorMsg)
        {
            if (autoredirect)
            {
                require(global.path + '/error.js')(req, res, null, '로그인이 필요합니다.', '/login', '로그인 페이지', 404, 'ko')
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
            for (let val of ipBlocks)
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
                {
                    if (username === undefined) return false
                    const permsU = await perms.findAll({where: {username: username}})
                    let isAdmin = false
                    permsU.forEach((v) =>
                    {
                        isAdmin = isAdmin || (v.perm == 'admin')
                    })
                    if (!isAdmin) return false
                }
                break
            case 'grant':
                {
                    if (username === undefined) return false
                    const p = await perms.findAll({where: {username: username}})
                    let isAdmin = false
                    p.forEach((v) =>
                    {
                        isAdmin = isAdmin || (v.perm == 'grant')
                    })
                    if (!isAdmin) return false
                }
                break
            case 'acl':
                {
                    if (username === undefined) return false
                    const permsACL = await perms.findAll({where: {username: username}})
                    let isAdmin = false
                    permsACL.forEach((v) =>
                    {
                        isAdmin = isAdmin || (v.perm == 'acl')
                    })
                    if (!isAdmin) return false
                }
                break
            //GROUPS
            case 'login':
                {
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
                                if (b.isForever)
                                {
                                    return `You are blocked forever by ${b.doneBy} - ${b.comment}`
                                }
                                else
                                {
                                    return `You are blocked until ${dateandtime.format(b.until, global.dtFormat)} by ${b.doneBy} - ${b.comment}`
                                }
                            }
                            else continue
                        }
                    }
                    else
                    {
                        if (username === undefined) return false
                    }
                }
                break
            case 'everyone':
                {
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
                        else continue
                    }
                    else continue //ip block is already checked
                }
            case 'blocked':
                continue
        }
    }
    return true
}