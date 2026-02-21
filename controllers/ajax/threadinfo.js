module.exports = async (req, res) => {
    const query = req.query ? req.query.q : undefined
    const result = await req.app.locals.services.thread.getThreadInfo(query, {
        user: req.session ? req.session.username : undefined,
        ipAddress: req.ipAddress
    })

    if (!result) {
        res.json({})
        return
    }

    res.json(result)
}
