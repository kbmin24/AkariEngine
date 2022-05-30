const ejs = require('ejs')
const {Op} = require('sequelize')
const dt = require('date-and-time')

global.pageLength = 30
const pageLength = global.pageLength
module.exports = async (isHTML, req, res, boards, posts, block, perm, gongji, currentPost) =>
{
    const boardNow = await boards.findOne({where: {boardID: req.params.board}})
    if (!boardNow)
    {
        require(global.path + '/error.js')(req, res, null, '존재하지 않는 게시판입니다.', '/board', '게시판 홈', 404, 'ko')
        return
    }
    const pro = boardNow.readACL
    const acl = (pro == undefined ? 'blocked' : pro) //fallback
    const r = await require(global.path + '/pages/satisfyACL.js')(req, res, [acl], perm, block)
    if (r)
    {
        //do nothing
    }
    else if (r === undefined)
    {
        return //error message already given out
    }
    else
    {
        require(global.path + '/error.js')(req, res, req.session.username, '이 게시판의 읽기 권한이' + acl + ' 이기 때문에 글 열람이 불가합니다.', '/board', '게시판 홈', 200, 'ko')
        return
    }

    let page = 1
    if (currentPost !== null)
    {
        page = 0//Math.floor((boardNow.postCount - currentPost + 1) / global.pageLength) + 1
    }
    else
    {
        page = req.query.page * 1 || 1
    }

    let criteria = {boardID: boardNow.boardID}
    switch (req.query.searchCriteria)
    {
        case 'sub_content':
            {
                criteria = 
                {
                    boardID: boardNow.boardID,
                    [Op.or]: [
                        {title: {[Op.like]: `%${req.query.q}%`}},
                        {content: {[Op.like]: `%${req.query.q}%`}}
                    ]
                }
                break
            }
        case 'sub':
            {
                criteria = 
                {
                    boardID: boardNow.boardID,
                    title: {[Op.like]: `%${req.query.q}%`}
                }
                break
            }
        case 'content':
            {
                criteria = 
                {
                    boardID: boardNow.boardID,
                    content: {[Op.like]: `%${req.query.q}%`}
                }
                break
            }
        case 'writtenBy':
            {
                criteria =
                {
                    boardID: boardNow.boardID,
                    writtenBy: {[Op.like]: `%${req.query.q}%`}
                }
                break
            }
    }
    if (req.query.recommended === 'yes')
    {
        criteria.gechu = {
            [Op.gte]: global.conf.gaenyumThreshold
        }
    }
    let lst = await posts.findAll(
        {
            where: criteria,
            order:
            [
                ['idAtBoard', 'DESC']
            ],
            offset: (page - 1) * pageLength,
            limit: pageLength
        }
    )
    let ipProcessed = []
    lst.forEach((val, idx, array) =>
    {
        let ipNow = ''
        if (val.writtenIP)
        {
            let ipSplit = val.writtenIP.split('.')
            ipNow = `${ipSplit[0]}.${ipSplit[1]}`
        }
        ipProcessed.push(ipNow)
    })

    //find gongjis
    let gongjis = await gongji.findAll({where: {boardID: boardNow.boardID}, order: [['priority', 'ASC']]})
    let gongjiPost = []
    for (let g of gongjis)
    {
        let a = await posts.findOne({where: {boardID: boardNow.boardID, idAtBoard: g.postID}})
        if (!a) continue
        gongjiPost.push(a)
    }

    let html = await ejs.renderFile(__dirname + '/views/list.ejs',
    {
        boardName: boardNow.boardID,
        currentPost: currentPost,
        currentPage: page,
        postCount: boardNow.postCount,
        board: boardNow.boardID,
        username: req.session.username,
        ipProcessed: ipProcessed,
        post: lst,
        searchCriteria: req.query.searchCriteria,
        q: req.query.q,
        gongji: gongjiPost,
        isRecommended: req.query.recommended === 'yes'
    })
    if (isHTML) return html
    require(global.path + '/view.js')(req, res,
    {
        title: boardNow.boardTitle,
        titleLink: `/board/${boardNow.boardID}`,
        canonical: `/board/${boardNow.boardID}`,
        description: global.conf.boardDescriptions.hasOwnProperty(boardNow.boardID) ? global.conf.boardDescriptions[boardNow.boardID] : '',
        content: html,
        username: req.session.username,
        ipaddr: (req.headers['x-forwarded-for'] || req.socket.remoteAddress),
        wikiname: global.appname
    })
}