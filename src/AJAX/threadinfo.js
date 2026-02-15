const paths = require('../utils/paths')

module.exports = async (req, res, dbs = {}) =>
{
    //TODO: check permission
    var query = req.query.q
    if (!query)
    {
        res.json({})
        return
    }
    query = query.trim()
    const t = await dbs['thread'].findOne(
        {
            where: {
                'threadID': query
            },
        }
    )
    if (!t) return
    // TODO use middleware to check ACL instead of doing it here
    const r = await require(paths.resolve('pages', 'satisfyACL.js'))(req, res, ['everyone'], null, dbs['block'], true, true)
    res.json({'isOpen': t.isOpen, 'r': r})
    return
}
