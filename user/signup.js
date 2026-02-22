const paths = require('../utils/paths')
const i18n = require("i18n")

module.exports = async (req, res, users) =>
{
    //req.body.id,req.body.password,req.body.passwordConfirm
    
    if (req.body.password != req.body.passwordConfirm)
    {
        require(paths.resolve('info.js'))(req, res, null, i18n.__('register_pwNotMatch'), '/signup', i18n.__('register'), 200, 'ko')
        return
    }
    //create hashed PW
    const crypto = require('crypto')
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
        .then(async () => await require(paths.resolve('sendfile.js'))(req, res, i18n.__('register_done'), '/views/user/signupnotify.html'))
        .catch(_err => require(paths.utils('error'))(req, res, { description: i18n.__('register_fail'), returnLink: '/signup', returnName: i18n.__('register'), statusCode: 500 }))
    })
}
