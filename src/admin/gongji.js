// TODO rename this file

const paths = require('../utils/paths')

module.exports = async (req, res, gongji) =>
{
    if (!req.body.boardname)
    {
        require(paths.resolve('error.js'))(req, res, { description: '게시판 ID가 필요합니다.', returnLink: 'javascript:window.history.back()', returnName: '글쓰기', statusCode: 200 })
        return
    }
    await gongji.destroy({
        where:
        {
            boardID: req.body.boardname
        }
    })
    let pri = 1
    req.body.gongjis = req.body.gongjis.replace(/\r\n/igm, '\n').trim()
    let sp = req.body.gongjis.split('\n')
    if (sp.length > 0)
    {
        for (let i of sp)
        {
            await gongji.create({
                boardID: req.body.boardname,
                postID: i,
                priority: pri++
            })
        }
    }
    res.redirect('/board/' + req.body.boardname)
}
