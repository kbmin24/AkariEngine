module.exports = async (req, res, sequelize, users, perm) =>
{
    //req.body.id,req.body.password,req.body.passwordConfirm
    if (!(await require(global.path + '/tools/captcha.js').chkCaptcha(req, res, perm))) return
    
    if (req.body.password != req.body.passwordConfirm)
    {
        require(global.path + '/error.js')(req, res, null, 'Passwords do not match. Please input the password and its confirmation correctly.', '/signup', 'the account creation page')
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
        .then(async () => await require(global.path + '/sendfile.js')(req, res, 'Signup completed', '/views/user/signupnotify.html'))
        .catch(err => require(global.path + '/error.js')(req, res, null, 'Could not create the user. Please check whether the user already exists.', '/signup', 'the account creation page'))
    })
}