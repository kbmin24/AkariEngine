const crypto = require('crypto')
module.exports = async (req, res, tables = {}) =>
{
    switch (req.params.name)
    {
        case 'setSign':
            {
                tables['settings'].destroy({
                    where:
                    {
                        user: req.session.username,
                        key: 'sign'
                    }
                })
                tables['settings'].create({
                        user: req.session.username,
                        key: 'sign',
                        value: req.body.sign
                })
            require(global.path + '/info.js')(req, res, null, 'Done.', '/settings', 'the settings page')
            return
            }
        case 'changePassword':
            {
                const user = await tables['users'].findOne({where: {username: req.session.username}})
                const oldPassword = req.body.oldpassword
                const newPassword = req.body.password
                if (!user)
                {
                    require(global.path + '/error.js')(req, res, null, 'You are not logged in', '/login', 'the login page')
                    return
                }
                
                //password check
                crypto.pbkdf2(oldPassword, user.salt, 10000, 64, 'sha512', async (err, hashedPW) =>
                {
                    if (err) throw new err
                    if (hashedPW.toString('base64') != user.password)
                    {
                        //bad.
                        require(global.path + '/error.js')(req, res, null, 'Please check whether you typed your previous password correctly.', 'javascript:window.history.back()', 'the previous  page')
                        return
                    }
                    //good. Put new password in.
                    crypto.pbkdf2(newPassword, user.salt, 10000, 64, 'sha512', async (err, hashedPW) =>
                    {
                        if (err) throw new error
                        await user.update({password: hashedPW.toString('base64')})
                        require(global.path + '/info.js')(req, res, null, 'Done.', '/settings', 'the settings page')
                    })
                })
                return
            }
    }
}