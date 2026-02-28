import { renderTemplateInLayout } from '../../utils/httpHelper.js'

export default async (req, res) => {
    const model = await req.app.locals.services.viewcount.getViewRankViewModel()

    await renderTemplateInLayout(req, res, 'pages/viewcount.ejs', {
        rank: model.rank
    }, {
        title: '오늘의 문서 조회수 랭킹'
    })
}
