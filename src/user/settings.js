import crypto from 'crypto'
import renderInfo from '../info.js'
import renderError from '../utils/error.js'

export default async (req, res, tables = {}) =>
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
            renderInfo(req, res, null, '완료되었습니다.', '/settings', '설정 페이지', 200, 'ko')
            return
            }
        case "changeSkin":
                {
                    const skinName = req.body.skin
                    tables['settings'].destroy({
                        where:
                        {
                            user: req.session.username,
                            key: 'skin'
                        }
                    })
                    tables['settings'].create({
                            user: req.session.username,
                            key: 'skin',
                            value: skinName
                    })
                }
                renderInfo(req, res, null, '완료되었습니다.', '/settings', '설정 페이지', 200, 'ko')
                return
        case 'changePassword':
            {
                const user = await tables['users'].findOne({where: {username: req.session.username}})
                const oldPassword = req.body.oldpassword
                const newPassword = req.body.password
                if (!user)
                {
                    renderError(req, res, { description: `로그인이 필요합니다.`, returnLink: '/login', returnName: '로그인 페이지', statusCode: 403 })
                    return
                }
                
                //password check
                crypto.pbkdf2(oldPassword, user.salt, 10000, 64, 'sha512', async (err, hashedPW) =>
                {
                    if (err) throw new err
                    if (hashedPW.toString('base64') != user.password)
                    {
                        //bad.
                        renderError(req, res, { description: `이전 비밀번호를 올바르게 입력했는지 확인해 주세요.`, returnLink: 'javascript:window.history.back()', returnName: '이전 페이지', statusCode: 403 })
                        return
                    }
                    //good. Put new password in.
                    crypto.pbkdf2(newPassword, user.salt, 10000, 64, 'sha512', async (err, hashedPW) =>
                    {
                        if (err) throw new Error("Password generation failed")
                        await user.update({password: hashedPW.toString('base64')})
                        renderInfo(req, res, null, '완료되었습니다.', '/settings', '설정 페이지', 200, 'ko')
                    })
                })
                return
            }
    }
}
