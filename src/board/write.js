module.exports = async (req, res, boards, posts, block, perm, boardfiles) =>
{
    const boardNow = await boards.findOne({where: {boardID: req.params.board}})
    if (!boardNow)
    {
        require(global.path + '/error.js')(req, res, null, '존재하지 않는 게시판입니다.', '/board', '게시판 홈', 404, 'ko')
        return
    }
    if (!(await require(global.path + '/tools/captcha.js').chkCaptcha(req, res, perm))) return
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
    if (!req.body.title)
    {
        require(global.path + '/error.js')(req, res, null, '제목이 필요합니다.', 'javascript:window.history.back()', '글쓰기', 200, 'ko')
        return
    }
    if (!req.body.content)
    {
        require(global.path + '/error.js')(req, res, null, '내용이 필요합니다.', 'javascript:window.history.back()', '글쓰기', 200, 'ko')
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
        require(global.path + '/error.js')(req, res, req.session.username, '이 게시판의 쓰기 권한이' + acl + ' 이기 때문에 글 작성이 불가합니다.', 'javascript:window.history.back()', '글쓰기', 200, 'ko')
        return
    }

    req.body.content = req.body.content.replace(/\r\n/g, '\n')
    let doneby = req.session.username
    if (doneby === undefined) req.body.nickname
    let postOptions = {
        idAtBoard: boardNow.postCount + 1,
        boardID: boardNow.boardID,
        title: req.body.title,
        writtenBy: req.session.username,
        content: req.body.content,
        viewCount: 0,
        commentCount: 0,
        gechu: 0,
        bichu: 0
    }
    if (req.session.username === undefined)
    {
        postOptions['writtenBy'] = req.body.nickname
        postOptions['writtenIP'] = req.headers['x-forwarded-for'] || req.socket.remoteAddress
        
        //비밀번호 솔트화
        const crypto = require('crypto')
        const salt = crypto.randomBytes(64).toString('base64')
        const saltedPW = crypto.pbkdf2Sync(req.body.pw, salt, 10000, 64, 'sha512')
        postOptions['ipPW'] = saltedPW.toString('base64')
        postOptions['ipPWsalt'] = salt
    }
    let pg = await posts.create(postOptions)
    boardNow.update({postCount: boardNow.postCount + 1})

    let fre = /<img src=\"\/boarduploads\/([a-zA-Z0-9]+)">/mig
    let er
    while ((er = fre.exec(req.body.content)) !== null)
    {
        let fname = er[1]
        let fReg = await boardfiles.findOne(
        {
            where:
            {
                boardID: pg.boardID,
                fileName: fname
            }
        })
        if (!fReg.postID)
        {
            await fReg.update({postID: pg.idAtBoard})
        }
    }

    res.redirect(`/board/read/${pg.boardID}?no=${pg.idAtBoard}`)
}