import ejs from 'ejs'
import paths from '../utils/paths.js'
import renderError from '../utils/error.js'
import renderView from '../view.js'

export default async (req, res) => {
    let pagename = req.params.name
    if (pagename === undefined)
    {
        renderError(req, res, { description: '페이지 이름이 없습니다.', returnLink: '/', returnName: '대문', statusCode: 404 })
        return
    }
    
    const lnk = await global.db.links.findAndCountAll(
        {
            where: {dest: pagename},
            order: [ ['source', 'ASC'] ]
        }
    )
    const html = await ejs.renderFile(paths.view('pages/xref.ejs'),
    {
        entries: lnk.rows,
        count: lnk.count,
    })
    renderView(req, res,
    {
        title: `${pagename}의 역링크`,
        content: html,
        username: req.session.username,
        isPage: true,
        pageMode: "xref",
        pagename: pagename
    })
}
