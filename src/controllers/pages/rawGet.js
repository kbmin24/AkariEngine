export default async (req, res) => {
    const content = await req.app.locals.services.page.getRawContent({
        title: req.params.name,
        rev: req.query.rev,
        user: req.session.username,
        ipAddress: req.ipAddress
    })

    res.setHeader('content-type', 'text/plain')
    res.send(content)
}
