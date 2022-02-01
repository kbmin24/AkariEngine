module.exports = async (req, res, boards, posts, boardcomment, block, perm) =>
{
    const boardNow = await boards.findOne({where: {boardID: req.body.boardid}})
    if (!boardNow)
    {
        require(global.path + '/error.js')(req, res, null, '존재하지 않는 게시판입니다.', '/board', '게시판 홈', 404, 'ko')
        return
    }
    const articleNow = await posts.findOne({where: {boardID: boardNow.boardID, idAtBoard: req.body.postid}})
    if (!articleNow)
    {
        require(global.path + '/error.js')(req, res, null, '존재하지 않는 게시물입니다.', '/board', '게시판 홈', 404, 'ko')
        return
    }
    if (!req.session.username)
    {
        if (req.body.nickname.trim() == "")
        {
            require(global.path + '/error.js')(req, res, null, '닉네임이 필요합니다.', 'javascript:window.history.back()', '글쓰기', 200, 'ko')
            return
        }
        if (req.body.pw.trim() == "")
        {
            require(global.path + '/error.js')(req, res, null, '비밀번호가 필요합니다.', 'javascript:window.history.back()', '글쓰기', 200, 'ko')
            return
        }
    }
    if (!req.body.content)
    {
        require(global.path + '/error.js')(req, res, null, '내용이 필요합니다.', 'javascript:window.history.back()', '글쓰기', 200, 'ko')
        return
    }
    if (isNaN(req.body.depth) ||
        req.body.depth <= 0 ||
        req.body.depth > 10 ||
        req.body.depth * 1 > 1 &&
            (isNaN(req.body.parent) ||
            !(await boardcomment.findOne(
                {
                    where: {id: req.body.parent}
                })
            ))
        )
    {
        require(global.path + '/error.js')(req, res, null, '잘못된 접근입니다.', '/board', '게시판 홈', 403, 'ko')
        return
    }

    const pro = boardNow.writeACL
    const acl = (pro == undefined ? 'everyone' : pro) //fallback
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
        require(global.path + '/error.js')(req, res, req.session.username, '이 게시판의 쓰기 권한이' + acl + ' 이기 때문에 댓글 작성이 불가합니다.', 'javascript:window.history.back()', '이전 페이지', 200, 'ko')
        return
    }
    req.body.content = req.body.content.replace(/\r\n/g, '\n')
    let doneby = req.session.username
    if (doneby === undefined) req.body.nickname
    let postOptions = {
        boardID: boardNow.boardID,
        postID: req.body.postid,
        commentDepth: req.body.depth,
        doneBy: req.session.username,
        comment: req.body.content,
        parentCommentID: req.body.parent * 1
    }
    if (req.session.username === undefined)
    {
        postOptions['doneBy'] = req.body.nickname
        postOptions['doneIP'] = req.headers['x-forwarded-for'] || req.socket.remoteAddress
        
        //비밀번호 솔트화
        const crypto = require('crypto')
        const salt = crypto.randomBytes(64).toString('base64')
        const saltedPW = crypto.pbkdf2Sync(req.body.pw, salt, 10000, 64, 'sha512')
        postOptions['ipPW'] = saltedPW.toString('base64')
        postOptions['ipPWsalt'] = salt
    }
    await boardcomment.create(postOptions)
    await articleNow.update({commentCount: articleNow.commentCount + 1})
    res.redirect(`/board/read/${req.body.boardid}?no=${req.body.postid}`)
}