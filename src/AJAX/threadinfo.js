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
    const r = await require(global.path + '/pages/satisfyACL.js')(req, res, ['everyone'], null, dbs['block'], true, true)
    res.json({'isOpen': t.isOpen, 'r': r})
    return
}