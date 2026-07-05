export default async (req, res) => {
    const page = typeof req.query.p === 'string' ? req.query.p.trim() : ''
    const permissions = page
        ? await req.app.locals.repositories.protections.findAllByTitle(page)
        : []
    
    const filteredPermissions = []
    for (const permission of permissions) {
        if (!permission.revision) continue
        filteredPermissions.push({
            title: permission.title,
            revision: permission.revision,
            task: permission.task,
            protectionLevel: permission.protectionLevel
        })
    }

    res.json({
        page,
        permissions: filteredPermissions
    })
}
