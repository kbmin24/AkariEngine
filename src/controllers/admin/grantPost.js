const RESERVED_FIELDS = new Set(['grantTo', '_csrf'])

export default async (req, res) => {
    const permissions = Object.keys(req.body)
        .filter(key => !RESERVED_FIELDS.has(key) && global.perms.includes(key))

    await req.app.locals.services.admin.grantPermissions({
        actor: req.session.username,
        grantTo: req.body.grantTo,
        permissions
    })

    res.json({ success: true })
}
