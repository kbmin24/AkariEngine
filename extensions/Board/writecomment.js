
import crypto from 'crypto'
import satisfyACL from './satisfyACL.js'
import errorPage from '../../utils/error.js'

export default async (req, res, boards, posts, boardcomment, block, perm) =>
{
    const boardNow = await boards.findOne({where: {boardID: req.body.boardid}})
    if (!boardNow)
    {
        errorPage(req, res, { description: '존재하지 않는 게시판입니다.', returnLink: '/board', returnName: '게시판 홈', statusCode: 404 })
        return
    }
    const articleNow = await posts.findOne({where: {boardID: boardNow.boardID, idAtBoard: req.body.postid}})
    if (!articleNow)
    {
        errorPage(req, res, { description: '존재하지 않는 게시물입니다.', returnLink: '/board', returnName: '게시판 홈', statusCode: 404 })
        return
    }
    if (!req.session.username)
    {
        if (req.body.nickname.trim() == "")
        {
            errorPage(req, res, { description: '닉네임이 필요합니다.', returnLink: 'javascript:window.history.back()', returnName: '글쓰기', statusCode: 200 })
            return
        }
        if (req.body.pw.trim() == "")
        {
            errorPage(req, res, { description: '비밀번호가 필요합니다.', returnLink: 'javascript:window.history.back()', returnName: '글쓰기', statusCode: 200 })
            return
        }
    }
    if (!req.body.content)
    {
        errorPage(req, res, { description: '내용이 필요합니다.', returnLink: 'javascript:window.history.back()', returnName: '글쓰기', statusCode: 200 })
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
        errorPage(req, res, { description: '잘못된 접근입니다.', returnLink: '/board', returnName: '게시판 홈', statusCode: 403 })
        return
    }

    const pro = boardNow.writeACL
    const acl = (pro == undefined ? 'everyone' : pro) //fallback
    const r = await satisfyACL(req, res, [acl], perm, block)
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
        errorPage(req, res, { description: '이 게시판의 쓰기 권한이' + acl + ' 이기 때문에 댓글 작성이 불가합니다.', returnLink: 'javascript:window.history.back()', returnName: '이전 페이지', statusCode: 200 })
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
        postOptions['doneIP'] = req.ipAddress
        
        //비밀번호 솔트화
        const salt = crypto.randomBytes(64).toString('base64')
        const saltedPW = crypto.pbkdf2Sync(req.body.pw, salt, 10000, 64, 'sha512')
        postOptions['ipPW'] = saltedPW.toString('base64')
        postOptions['ipPWsalt'] = salt
    }
    await boardcomment.create(postOptions)
    await articleNow.update({commentCount: articleNow.commentCount + 1})
    res.redirect(`/board/read/${req.body.boardid}?no=${req.body.postid}`)
}
