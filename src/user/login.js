module.exports = (req, res, sequelize, users) =>
{
    //todo: already logged in?
    const crypto = require('crypto')
    //retrieve salt

    var loginUser = null
    users.findOne({where: {username: req.body.id}}).then( loginUser =>
    {
        if (loginUser)
        {
            const id = req.body.id
            const plainPW = req.body.password
            const realPW = loginUser.password //hashed version
            const salt = loginUser.salt

            //now let's hash the PW & compare it.
            crypto.pbkdf2(plainPW, salt, 10000, 64, 'sha512', (err, hashedPW) =>
            {
                if (err) throw new err
                if (hashedPW.toString('base64') == realPW)
                {
                    //login success. give a cookie
                    //and redirect.
                    req.session.username = id
                    res.redirect('/')
                }
                else
                {
                    console.log("Login error (password mismatch) " + id)
                    require(global.path + '/error.js')(req, res, null, 'The password given is incorrect. Please try again.', '/login', 'the login page')
                }
            })
        }
        else
        {
            console.log("Login error (no such user): " + req.body.id)
            require(global.path + '/error.js')(req, res, null, 'The user given does not exist. Please ensure that you inputted it correctly.', '/login', 'the login page')
        }
    })
}