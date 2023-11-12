const date = require('date-and-time')
const ejs = require('ejs')
const { Op } = require("sequelize")
module.exports = async (req, res, adminlog) =>
{
    const username = req.session.username
    const showfrom = !isNaN(req.query.from) ? req.query.from: 0
    var where = {}
    if (req.query.doneBy)
    {
        where['username'] = req.query.doneBy
    }
    else if (req.query.job)
    {
        where['job'] = {[Op.substring]: req.query.job}
    }
    const log = await adminlog.findAndCountAll(
    {
        where: where,
        order:
        [
            ['createdAt', 'DESC']
        ],
        limit: 30,
        offset: showfrom
    })
    const html = await ejs.renderFile(global.path + '/views/admin/adminlog.ejs',
    {
        changes: log.rows,
        count: log.count,
        from: showfrom,
        doneBy: req.query.doneBy,
        job: req.query.job,
        date: date
    })
    require(global.path + '/view.js')(req, res,
    {
        title: 'Admin Log',
        content: html,
        username: username,
        ipaddr: (req.headers['x-forwarded-for'] || req.socket.remoteAddress),
        
    })
    return
}