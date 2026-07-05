export default async (req, res) => {
    if (req.params.name.toLowerCase().startsWith('file:')) {
        return res.status(400).json({ error: true, i18nKey: 'move_nofile' })
    }

    await req.app.locals.services.page.movePage({
        oldTitle: req.params.name,
        newTitle: req.body.newName,
        user: req.session.username,
        ipAddress: req.ipAddress
    })

    res.json({ success: true, redirect: '/w/' + req.body.newName })
}
