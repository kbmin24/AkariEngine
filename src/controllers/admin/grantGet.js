export default async (req, res) => {
    if (req.query.grantTo === undefined) {
        return res.json({ selectUser: true })
    }

    const permissions = await req.app.locals.services.permission.findAllPermissions(req.query.grantTo)

    res.json({
        grantTo: req.query.grantTo,
        permissions
    })
}
