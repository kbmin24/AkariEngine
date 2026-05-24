import fs from 'fs/promises'
export default async (req, res) => {
    const filename = req.body.filename
    const filePageName = `File:${filename}`
    const filenameOnDisk = req.file.filename
    const filePath = req.file.path
    const fileExplanation = req.body.explanation

    const username = req.session.username
    const ipAddress = req.ipAddress

    try {
        await req.app.locals.services.file.uploadPostProcess({
            filename,
            filePageName,
            filenameOnDisk,
            fileExplanation,
            username,
            ipAddress
        })

        res.redirect(`/w/${filePageName}`)
    } catch (error) {
        await fs.unlink(filePath)
        throw error
    }
}