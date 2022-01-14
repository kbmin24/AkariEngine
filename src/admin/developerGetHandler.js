const ejs = require('ejs')
const date = require('date-and-time')
const {Op} = require('sequelize')
module.exports = async (req, res, options) =>
{
    const username = req.session.username
    if (username === undefined)
    {
        require(global.path + '/error.js')(req, res, null, 'Please login.', '/login', 'the login page')
        return
    }
    if (!(await perm.findOne({where: {username: req.session.username, perm: 'developer'}})))
    {
        
    }
}