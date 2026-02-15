const ejs = require('ejs')
const paths = require('../utils/paths')
const logger = require(paths.utils('logger'))
module.exports = async (req, res) => {
    let pagename = req.params.name
    if (pagename === undefined)
    {
        require(paths.resolve('error.js'))(req, res, null, '페이지 이름이 없습니다.', '/', '대문', 404, 'ko')
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
    require(paths.resolve('view.js'))(req, res,
    {
        title: `${pagename}의 역링크`,
        content: html,
        username: req.session.username,
        isPage: true,
        pageMode: "xref",
        pagename: pagename
    })
}
