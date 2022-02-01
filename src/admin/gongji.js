module.exports = async (req, res, gongji) =>
{
    if (!req.body.boardname)
    {
        require(global.path + '/error.js')(req, res, null, '게시판 ID가 필요합니다.', 'javascript:window.history.back()', '글쓰기', 200, 'ko')
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
    if (sp.length > 1)
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