import { EditConflictError } from '../../services/errors.js'
import { genCaptcha } from '../../utils/captcha.js'

export default async (req, res) => {
    try {
        await req.app.locals.services.page.editPage({
            title: req.params.name,
            baseRev: req.body.baseRev,
            content: req.body.content,
            editPrefix: req.body.editPrefix || '',
            editSuffix: req.body.editSuffix || '',
            user: req.session.username,
            ipAddress: req.ipAddress,
            comment: req.body.comment
        })

        res.json({ success: true, redirect: '/w/' + req.params.name })
    } catch (err) {
        if (err instanceof EditConflictError) {
            res.status(409).json({
                success: false,
                error: 'EditConflictError',
                baseRev: err.details.baseRev,
                conflictRev: err.details.conflictRev,
                merged: err.merged,
                chunks: err.chunks,
                conflicts: err.conflicts,
                csrfToken: req.csrfToken(),
                captcha: await genCaptcha()
            })
        } else {
            throw err
        }
    }
}
