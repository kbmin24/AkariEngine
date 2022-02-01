const ejs = require('ejs')
module.exports = async (req, res, boards, posts) =>
{
    let boardMatome = [] //includes HTML
    for( const val of global.conf.boardHome.boards)
    {
        let id = val.id
        let bd = await boards.findOne({where: {boardID: id}})
        let bdName = bd.boardTitle
        let postlist = await posts.findAll(
        {
            where:
            {
                boardID: id,
            },
            order:
            [
                ['id', 'DESC']
            ],
            limit: Math.min(global.conf.boardHome.postCount, bd.postCount)
        })
        let HTML = await ejs.renderFile(__dirname + '/views/boardHomeElement.ejs',
        {
            id: id,
            title: bdName,
            posts: postlist
    })

        boardMatome.push(HTML)
    }
    ejs.renderFile(__dirname + '/views/boardHome.ejs',
    {
        boardMatome: boardMatome
    }, (err, html) => 
    {
        if (err)
        {
            console.error(err)
            res.writeHead(500).write('Internal Server Error')
            return
        }
        res.render('outline',
        {
            title: "게시판 홈",
            titleLink: "/board/",
            content: html,
            username: req.session.username,
            ipaddr: (req.headers['x-forwarded-for'] || req.socket.remoteAddress),
            wikiname: global.appname
        })
    })
}