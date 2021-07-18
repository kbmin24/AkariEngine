const e = require("express")

module.exports = async (req, res, ACL, perms, autoredirect=true) =>
{
    const username = req.session.username
    const notLoggedin = username === undefined && !(ACL == 'login' || ACL == 'everyone' || ACL == 'blocked')
    if (notLoggedin)
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
            return username !== undefined
        case 'everyone':
        case 'blocked':
            return true
            //todo: check for blocks
    }
}