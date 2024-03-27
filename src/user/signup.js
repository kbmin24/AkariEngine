module.exports = async (req, res, sequelize, users, perm) =>
{
    //req.body.id,req.body.password,req.body.passwordConfirm
    if (!(await require(global.path + '/tools/captcha.js').chkCaptcha(req, res, perm))) return
    
    if (req.body.password != req.body.passwordConfirm)
    {
        require(global.path + '/info.js')(req, res, null, global.i18n.__('register_pwNotMatch'), '/signup', global.i18n.__('register'), 200, 'ko')
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
        .then(async () => await require(global.path + '/sendfile.js')(req, res, global.i18n.__('register_done'), '/views/user/signupnotify.html'))
        .catch(err => require(global.path + '/error.js')(req, res, null, global.i18n.__('register_fail'), '/signup', global.i18n.__('register'), 500, 'ko'))
    })
}