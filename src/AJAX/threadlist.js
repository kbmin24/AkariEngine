module.exports = async (req, res, thread) =>
{
    //find open threads
    var query = req.query.q
    if (!query)
    {
        res.json({})
        return
    }
    query = query.trim()
    const t = await thread.findAll(
        {
            where: {
                'pagename': query,
                isOpen: true
            },
        }
    )
    res.json(t)
    return
}