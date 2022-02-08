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
            require(global.path + '/info.js')(req, res, null, '완료되었습니다.', '/settings', '설정 페이지', 200, 'ko')
            return
            }
        case 'changePassword':
            {
                const user = await tables['users'].findOne({where: {username: req.session.username}})
                const oldPassword = req.body.oldpassword
                const newPassword = req.body.password
                if (!user)
                {
                    require(global.path + '/error.js')(req, res, null, `로그인이 필요합니다.`, '/login', '로그인 페이지', 403, 'ko')
                    return
                }
                
                //password check
                crypto.pbkdf2(oldPassword, user.salt, 10000, 64, 'sha512', async (err, hashedPW) =>
                {
                    if (err) throw new err
                    if (hashedPW.toString('base64') != user.password)
                    {
                        //bad.
                        require(global.path + '/error.js')(req, res, null, `이전 비밀번호를 올바르게 입력했는지 확인해 주세요.`, 'javascript:window.history.back()', '이전 페이지', 403, 'ko')
                        return
                    }
                    //good. Put new password in.
                    crypto.pbkdf2(newPassword, user.salt, 10000, 64, 'sha512', async (err, hashedPW) =>
                    {
                        if (err) throw new error
                        await user.update({password: hashedPW.toString('base64')})
                        require(global.path + '/info.js')(req, res, null, '완료되었습니다.', '/settings', '설정 페이지', 200, 'ko')
                    })
                })
                return
            }
    }
}