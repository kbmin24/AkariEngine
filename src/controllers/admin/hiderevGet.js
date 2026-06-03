export default async (req, res) => {
    res.json({ csrfToken: req.csrfToken() })
}
