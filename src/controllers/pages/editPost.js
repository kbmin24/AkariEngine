export default async (req, res) => {
    await req.app.locals.services.page.editPage({
        title: req.params.name,
        content: req.body.content,
        req,
        editPrefix: req.body.editPrefix || '',
        editSuffix: req.body.editSuffix || '',
        user: req.session.username,
        ipAddress: req.ipAddress,
        comment: req.body.comment
    })

    res.json({ success: true, redirect: '/w/' + req.params.name })
}
