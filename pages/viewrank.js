
import ejs from 'ejs'
import paths from '../utils/paths.js'
import renderView from '../view.js'

export default async (req, res, viewcount) =>
{
    let rank = await viewcount.findAll(
        {
            limit: 30,
            order:
            [
                ['count', 'DESC']
            ],
        }
    )
    const html = await ejs.renderFile(paths.view('pages/viewcount.ejs'),
    {
        rank: rank
    })
    renderView(req, res,
    {
        title: '오늘의 문서 조회수 랭킹',
        content: html,
        username: req.session.username,
        ipaddr: req.ipAddress,
        
    })
}
