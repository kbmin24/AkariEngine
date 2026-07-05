export default async (req, res) => {
    const title = req.params.name
    const user = req.session.username
    const comment = req.body.comment

    if (title.toLowerCase().startsWith('file:')) {
        const m = /^File:(.*)$/i.exec(title)
        const filename = m && m[1] ? m[1] : ''
        await req.app.locals.services.file.purgeFile({ filename, user, comment })
    } else {
        await req.app.locals.services.page.purgePage({ title, user, comment })
    }

    res.json({ success: true })
}
