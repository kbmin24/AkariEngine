import { Op } from 'sequelize'
import logger from '../utils/logger.js'
import crypto from 'node:crypto'
import renderError from '../utils/error.js'

export default async (req, res, users, loginhistory) =>
{

    //remove 'too old' login history.
    await loginhistory.destroy(
        {
            where: {
                createdAt: {[Op.lt]: (new Date() - 7257600000)} //12 weeks 7257600000
            }
        }
    )

    users.findOne({where: {username: req.body.id}}).then( async (loginUser) =>
    {
        if (loginUser)
        {
            const id = req.body.id
            const ipaddr = req.ipAddress
            const plainPW = req.body.password
            const realPW = loginUser.password //hashed version
            const salt = loginUser.salt

            //now let's hash the PW & compare it.
            crypto.pbkdf2(plainPW, salt, 10000, 64, 'sha512', async (err, hashedPW) =>
            {
                if (err) throw new err
                if (hashedPW.toString('base64') == realPW)
                {
                    //login success. give a cookie
                    req.session.username = loginUser.username
                    //create login history
                    await loginhistory.create({username: loginUser.username, ipaddr: ipaddr})
                    //and redirect.
                    res.redirect('/')
                }
                else
                {
                    logger.warn('Login error (password mismatch)', { id, ipaddr })
                    renderError(req, res, { description: `비밀번호가 틀렸습니다. 다시 시도해 주세요.`, returnLink: '/login', returnName: '로그인 페이지', statusCode: 403 })
                }
            })
        }
        else
        {
            logger.warn('Login error (no such user)', { id: req.body.id })
            renderError(req, res, { description: `사용자를 찾을 수 없습니다. 사용자명을 올바르게 입력했는지 확인해 주세요.`, returnLink: '/login', returnName: '로그인 페이지', statusCode: 403 })
        }
    })
}
