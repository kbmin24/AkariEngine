import fs from 'fs/promises'

export default async (req, res) => {
    const filename = req.body.filename
    const filePageName = `File:${filename}`
    const filenameOnDisk = req.file.filename
    const filePath = req.file.path
    const fileExplanation = req.body.explanation

    try {
        await req.app.locals.services.file.uploadPostProcess({
            filename,
            filePageName,
            filenameOnDisk,
            fileExplanation,
            username: req.session.username,
            ipAddress: req.ipAddress
        })

        res.json({ success: true, redirect: `/w/${filePageName}` })
    } catch (error) {
        await fs.unlink(filePath)
        throw error
    }
}
