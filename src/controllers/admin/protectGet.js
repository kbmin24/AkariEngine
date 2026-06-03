export default async (req, res) => {
    const username = req.session.username
    const { repositories, services } = req.app.locals
    const permsPresent = await repositories.protections.findAllByTitle(req.params.name)

    const hasAcl = username
        ? await services.permission.hasPermission(username, 'acl')
        : false

    res.json({
        title: req.params.name,
        pagename: req.params.name,
        hasAcl,
        permissions: permsPresent
    })
}
