import i18n from 'i18n'
import crypto from 'node:crypto'
import renderInfo from '../info.js'
import sendFilePage from '../sendfile.js'
import renderError from '../utils/error.js'

export default async (req, res, users) =>
{
    //req.body.id,req.body.password,req.body.passwordConfirm
    
    if (req.body.password != req.body.passwordConfirm)
    {
        renderInfo(req, res, null, i18n.__('register_pwNotMatch'), '/signup', i18n.__('register'), 200, 'ko')
        return
    }
    //create hashed PW
    const salt = crypto.randomBytes(64).toString('base64')

    //create salted & hashed PW
    crypto.pbkdf2(req.body.password, salt, 10000, 64, 'sha512', (err, hashedPW) =>
    {
        if (err) throw new err
        users.create(
        {
            username: req.body.id,
            password: hashedPW.toString('base64'),
            salt: salt
        })
        .then(async () => await sendFilePage(req, res, i18n.__('register_done'), '/views/user/signupnotify.html'))
        .catch(_err => renderError(req, res, { description: i18n.__('register_fail'), returnLink: '/signup', returnName: i18n.__('register'), statusCode: 500 }))
    })
}
