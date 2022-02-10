const ejs = require('ejs')
const dt = require('date-and-time')
const sanitiseHtml = require('sanitize-html')
let readComments = async (boardID, postID, comments) =>
{
    let allcomments = await comments.findAll(
        {
            where:
            {
                boardID: boardID,
                postID: postID,
            },
            order:
            [
                ['id', 'ASC']
            ]
        }
    )
    let commentLevels = [[],[],[],[],[],[],[],[],[],[]]
    let commentTree = new Map()
    let commentCache = new Map() //How to get to a certain comment
    for (let c of allcomments)
    {
        if (!c.commentDepth || c.commentDepth > 10) continue //discard
        commentLevels[c.commentDepth - 1].push(c)
    }
    for (let level = 0; level < 10; level++)
    {
        for (let c of commentLevels[level])
        {
            //how to get to the parent map: commentCache.get(c.parentCommentID)
            let cache
            let cursor
            if (level == 0)
            {
                cache = []
                cursor = commentTree
            }
            else
            {
                cache = commentCache.get(c.parentCommentID)
                cursor = commentTree //shallow copy
            }
            for (let nextSelect of cache)
            {
                cursor = cursor.get(nextSelect).childComments
            }
            //sanitise
            c.comment.replace(/\r?\n/, '<br>')

            let ipProcessed = undefined
            if (c.doneIP)
            {
                let ipSplit = c.doneIP.split('.')
                ipProcessed = `${ipSplit[0]}.${ipSplit[1]}`
            }

            cursor.set(c.id, 
                {
                    comment: sanitiseHtml(c.comment, {allowedTags: [], allowedAttributes: {}, disallowedTagsMode: escape}),
                    doneBy: c.doneBy,
                    writtenIP: ipProcessed,
                    date: c.createdAt,
                    isDeleted: c.isDeleted,
                    childComments: new Map()
                })
            let newCache = cache.slice()
            newCache.push(c.id)
            commentCache.set(c.id, newCache)
        }
    }
    return {
        commentTree: commentTree,
        commentCount: allcomments.length
    }
}
module.exports = async (req, res, boards, posts, block, perm, comments, gongji) =>
{
    const boardNow = await boards.findOne({where: {boardID: req.params.board}})
    if (!boardNow)
    {
        require(global.path + '/error.js')(req, res, null, '존재하지 않는 게시판입니다.', '/board', '게시판 홈', 404, 'ko')
        return
    }
    if (!req.query.no)
    {
        require(global.path + '/error.js')(req, res, null, '존재하지 않는 게시물입니다.', '/board', '게시판 홈', 404, 'ko')
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
    const post = await posts.findOne({where: {idAtBoard: req.query.no, boardID: boardNow.boardID}})
    if (!post)
    {
        require(global.path + '/error.js')(req, res, null, '존재하지 않는 게시물입니다.', '/board', '게시판 홈', 404, 'ko')
        return
    }
    post.update({viewCount: post.viewCount + 1})
    let ipProcessed = ''
    if (post.writtenIP)
    {
        let ipSplit = post.writtenIP.split('.')
        ipProcessed = `${ipSplit[0]}.${ipSplit[1]}`
    }

    let commentTree = await readComments(boardNow.boardID, post.idAtBoard, comments)

    let lst = await require(__dirname + '/list.js')(true, req, res, boards, posts, block, perm, gongji, post.idAtBoard)
    
    //check if admin
    let isAdmin = (req.session.username && await perm.findOne({where:
        {
            username: req.session.username, 
            perm: 'board'
        }}) !== null ) === true
    post.content = sanitiseHtml(post.content, global.sanitiseOptions)
    ejs.renderFile(__dirname + '/views/read.ejs',
    {
        lst: lst,
        board: boardNow.boardID,
        username: req.session.username,
        ipProcessed: ipProcessed,
        post: post,
        commentTree: commentTree,
        isAdmin: isAdmin,
        csrfToken: req.csrfToken()
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
            title: boardNow.boardTitle,
            titleLink: `/board/${boardNow.boardID}`,
            content: html,
            username: req.session.username,
            description: global.conf.boardDescriptions.hasOwnProperty(boardNow.boardID) ? global.conf.boardDescriptions[boardNow.boardID] : '',
            ipaddr: (req.headers['x-forwarded-for'] || req.socket.remoteAddress),
            wikiname: global.appname
        })
    })
}