export default async (req, res) => {
    const model = await req.app.locals.services.viewcount.getViewRankViewModel()
    res.json({ rank: model.rank })
}
