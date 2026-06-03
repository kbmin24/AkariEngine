export default async (req, res) => {
    const target = await req.app.locals.services.search.resolveSearchRedirect({
        query: req.body.q ?? req.body.pagename
    })
    res.json({ redirect: target })
}
