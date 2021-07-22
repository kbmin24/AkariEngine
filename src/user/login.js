const { Op } = require('sequelize')
module.exports = async (req, res, users, loginhistory) =>
{
    const crypto = require('crypto')
 
    //remove 'too old' login history.
    await loginhistory.destroy(
        {
            where: {
                createdAt: {[Op.lt]: (new Date() - 7257600000)} //12 weeks 7257600000
            }
        }
    )

    var loginUser = null
    users.findOne({where: {username: req.body.id}}).then( async (loginUser) =>
    {
        if (loginUser)
        {
            const id = req.body.id
            const ipaddr = (req.headers['x-forwarded-for'] || req.socket.remoteAddress)
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
                    req.session.username = id
                    //create login history
                    await loginhistory.create({username: req.body.id, ipaddr: ipaddr})
                    //and redirect.
                    res.redirect('/')
                }
                else
                {
                    console.log("Login error (password mismatch) " + id + 'IP Address: ' + ipaddr)
                    require(global.path + '/error.js')(req, res, null, 'The password given is incorrect. Please try again.', '/login', 'the login page')
                }
            })
        }
        else
        {
            console.log("Login error (no such user): " + req.body.id)
            require(global.path + '/error.js')(req, res, null, 'The user given does not exist (Note: Username is case sensitive). Please ensure that you inputted it correctly.', '/login', 'the login page')
        }
    })
}