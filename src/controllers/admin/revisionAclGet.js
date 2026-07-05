export default async (req, res) => {
    const permissions = await req.app.locals.repositories.protections.findAllByTitle(req.params.name)
    const revisionPermissions = permissions
        .filter(permission => permission.revision)
        .map(permission => ({
            title: permission.title,
            revision: permission.revision,
            task: permission.task,
            protectionLevel: permission.protectionLevel
        }))

    res.json({
        page: req.params.name,
        permissions: revisionPermissions
    })
}
