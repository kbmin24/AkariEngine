import ejs from 'ejs'
import crypto from 'crypto'
import fs from 'fs'
import multer from 'multer'
import path from 'path'
import satisfyACL from './satisfyACL.js'
import * as captchaUtils from '../../src/utils/captcha.js'
import { asyncRoute } from '../../src/utils/httpHelper.js'
import renderError from '../../src/utils/error.js'
import errorPage from '../../src/utils/error.js'
import paths from '../../src/utils/paths.js'
import logger from '../../src/utils/logger.js'
import renderView from '../../src/view.js'
import boardHome from './boardHome.js'
import boardConf from './settings.js'
import boardWrite from './write.js'
import writeComment from './writecomment.js'
import boardRead from './read.js'
import boardList from './list.js'
import gongjiAdmin from './gongji.js'
import gechu from './AJAX/gechu.js'
import bichu from './AJAX/bichu.js'
import getgongjilist from './AJAX/getgongjilist.js'
import { fileURLToPath } from "url"
const __dirname = fileURLToPath(new URL(".", import.meta.url))

export default async (app, sequelize, csrfProtection) => {

    let boards = global.db.boards
    let posts = global.db.boardPosts
    let block = global.db.block
    let perm = global.db.perm
    let boardgechu = global.db.boardgechu //upvote
    let boardbichu = global.db.boardbichu //downvote
    let boardcomment = global.db.boardcomment
    let boardfiles = global.db.boardfiles
    let gongji = global.db.boardgongji

    app.get('/board/', async (req, res) => {
        boardHome(req, res, boards, posts)
    })
    app.get('/board/write/:board', csrfProtection, async (req, res) => {
        //존재하는 게시판인지 확인
        const boardNow = await boards.findOne({ where: { boardID: req.params.board } })
        if (!boardNow) {
            errorPage(req, res, { description: '존재하지 않는 게시판입니다.', returnLink: '/board', returnName: '게시판 홈', statusCode: 404 })
            return
        }
        
        const pro = boardNow.writeACL
        const acl = (pro == undefined ? 'everyone' : pro) //fallback
        const r = await satisfyACL(req, res, [acl], perm, block)
        if (r) {
            //do nothing
        }
        else if (r == undefined) {
            return //error message already given out
        }
        else {
            errorPage(req, res, { description: '이 게시판의 쓰기 권한이' + acl + ' 이기 때문에 글 작성이 불가합니다.', returnLink: 'javascript:window.history.back()', returnName: '글쓰기', statusCode: 200 })
            return
        }
        const captchaSVG = await captchaUtils.genCaptcha()
        ejs.renderFile(__dirname + '/views/write.ejs',
            {
                board: boardNow.boardID,
                username: req.session.username,
                captcha: captchaSVG,
                csrfToken: req.csrfToken()
            }, (err, html) => {
                if (err) {
                    logger.error('Board write page rendering failed', err)
                    res.writeHead(500).write('Internal Server Error')
                    return
                }
                renderView(req, res,
                    {
                        title: boardNow.boardTitle,
                        titleLink: `/board/${boardNow.boardID}`,
                        description: Object.hasOwn(boardConf.boardDescriptions, boardNow.boardID) ? boardConf.boardDescriptions[boardNow.boardID] : '',
                        content: html,
                        username: req.session.username,
                        ipaddr: req.ipAddress,

                    })
            })
    })
    app.post('/board/write/:board', csrfProtection, async (req, res) => {
        boardWrite(req, res, boards, posts, block, perm, boardfiles)
    })

    let storage = multer.diskStorage(
        {
            destination: (req, file, cb) => { cb(null, paths.resolve('public', 'boarduploads')) }
        }
    )
    function checkFileType(file, cb) {
        //https://stackoverflow.com/questions/60408575/how-to-validate-file-extension-with-multer-middleware
        const filetypes = /jpg|jpeg|jfif|pjpeg|pjp|png|gif|dib|bmp|webp|tif|tiff/i
        const ext = filetypes.test(path.extname(file.originalname).toLowerCase())
        const mime = filetypes.test(file.mimetype)
        if (mime && ext) {
            return cb(null, true)
        }
        else {
            let e = new Error('You can only upload JPG, JPEG, JFIF, PJPEG, PJP, PNG, GIF, DIB, BMP, WEBP, TIF and TIFF files.')
            e.code = 'BOARDUPLOAD_BADEXTENSION'
            cb(e)
        }
    }
    let boardUpload = multer({
        storage: storage,
        limits:
        {
            fields: 3,
            fieldNameSize: 255,
            fileSize: 4 * 1024 * 1024
        },
        fileFilter: async (req, file, cb) => {
            const fileSize = parseInt(req.headers['content-length'])
            if (fileSize > 4 * 1024 * 1024) {
                let e = new Error('File must be 4MB or less.')
                e.code = 'BOARD_LIMIT_FILE_SIZE'
                cb(e)
                return
            }
            checkFileType(file, cb)
        }
    })
    app.post('/board/upload', boardUpload.single('upload'), async (req, res) => {
        fs.readFile(req.file.path, (err, _data) => {
            if (err) {
                res.send(
                    {
                        error: '알 수 없는 오류가 발생하여 파일 업로드에 실패하였습니다.'
                    }
                )
            }
            else {
                boardfiles.create({
                    boardID: req.headers.boardid,
                    fileName: req.file.filename
                })
                res.send(
                    {
                        url: '/boarduploads/' + req.file.filename
                    }
                )
            }
        })
    })
    app.get('/board/deletepost', csrfProtection, async (req, res) => {
        ejs.renderFile(__dirname + '/views/deletePostVerify.ejs',
            {
                boardID: req.query.board,
                postID: req.query.id,
                username: req.session.username,
                passReq: req.query.passReq,
                csrfToken: req.csrfToken()
            }, (err, html) => {
                if (err) {
                    logger.error('Board delete post verify rendering failed', err)
                    res.writeHead(500).write('Internal Server Error')
                    return
                }
                renderView(req, res,
                    {
                        title: '정말로 글을 삭제하시겠습니까?',
                        content: html,
                        username: req.session.username,
                        ipaddr: req.ipAddress,

                    })
            })
    })
    app.post('/board/deletepost', csrfProtection, async (req, res) => {
        let isAdmin = (req.session.username && (await perm.findOne({
            where:
            {
                username: req.session.username,
                perm: 'board'
            }
        })) !== null) === true
        if (!req.body.postid) {
            errorPage(req, res, { description: '잘못된 접근입니다.', returnLink: '/board', returnName: '게시판 홈', statusCode: 403 })
            return
        }
        const boardNow = await boards.findOne({ where: { boardID: req.body.boardid } })

        let post = await posts.findOne({ where: { boardID: req.body.boardid, idAtBoard: req.body.postid } })
        if (!post) {
            errorPage(req, res, { description: '이미 삭제된 글입니다.', returnLink: '/board', returnName: '게시판 홈', statusCode: 403 })
            return
        }
        if (post.writtenIP && !isAdmin) {
            //check PW
            const saltedPW = crypto.pbkdf2Sync(req.body.pw, post.ipPWsalt, 10000, 64, 'sha512')
            if (saltedPW.toString('base64') != post.ipPW) {
                errorPage(req, res, { description: '비밀번호가 틀렸습니다.', returnLink: 'javascript:window.history.back()', returnName: '이전 페이지', statusCode: 403 })
                return
            }
        }
        else {
            if (!isAdmin && post.writtenBy != req.session.username) {
                errorPage(req, res, { description: '잘못된 접근입니다.', returnLink: '/board', returnName: '게시판 홈', statusCode: 403 })
                return
            }
        }
        //delete relevant images from the disk
        for (let f of await boardfiles.findAll({ where: { boardID: req.body.boardid, postID: req.body.postid } })) {
            try {
                fs.unlinkSync(paths.resolve('public', 'boarduploads', f.fileName))
            }
            catch {
                ; //ignore
            }
        }

        //delete the comment
        await boardcomment.destroy({ where: { boardID: req.body.boardid, postID: post.idAtBoard } })
        await posts.destroy({ where: { boardID: req.body.boardid, idAtBoard: req.body.postid } })
        await boardNow.update({ postCount: boardNow.postCount - 1 })

        res.redirect('/board')
    })
    app.post('/board/writecomment', csrfProtection, async (req, res) => {
        writeComment(req, res, boards, posts, boardcomment, block, perm)
    })
    app.get('/board/deletecomment', csrfProtection, async (req, res) => {
        ejs.renderFile(__dirname + '/views/deleteCommentVerify.ejs',
            {
                commentID: req.query.id,
                username: req.session.username,
                passReq: req.query.passReq,
                csrfToken: req.csrfToken()
            }, (err, html) => {
                if (err) {
                    logger.error('Board delete comment verify rendering failed', err)
                    res.writeHead(500).write('Internal Server Error')
                    return
                }
                renderView(req, res,
                    {
                        title: '정말로 댓글을 삭제하시겠습니까?',
                        content: html,
                        username: req.session.username,
                        ipaddr: req.ipAddress,

                    })
            })
    })
    app.post('/board/deletecomment', csrfProtection, async (req, res) => {
        let isAdmin = (req.session.username && (await perm.findOne({
            where:
            {
                username: req.session.username,
                perm: 'board'
            }
        })) !== null) === true
        if (!req.body.commentid) {
            errorPage(req, res, { description: '잘못된 접근입니다.', returnLink: '/board', returnName: '게시판 홈', statusCode: 403 })
            return
        }
        let comment = await boardcomment.findOne({ where: { id: req.body.commentid } })
        if (!comment || comment.isDeleted) {
            errorPage(req, res, { description: '이미 삭제된 댓글입니다.', returnLink: '/board', returnName: '게시판 홈', statusCode: 403 })
            return
        }
        if (comment.doneIP && !isAdmin) {
            //check PW
            const saltedPW = crypto.pbkdf2Sync(req.body.pw, comment.ipPWsalt, 10000, 64, 'sha512')
            if (saltedPW.toString('base64') != comment.ipPW) {
                errorPage(req, res, { description: '비밀번호가 틀렸습니다.', returnLink: 'javascript:window.history.back()', returnName: '이전 페이지', statusCode: 403 })
                return
            }
        }
        else {
            if (!isAdmin && comment.doneBy != req.session.username) {
                errorPage(req, res, { description: '잘못된 접근입니다.', returnLink: '/board', returnName: '게시판 홈', statusCode: 403 })
                return
            }
        }
        //'delete' comment by removing infos
        await comment.update(
            {
                doneBy: '',
                ipPW: '',
                ipPWSalt: '',
                comment: '',
                isDeleted: true
            }
        )
        res.redirect('/board')
    })
    app.get('/board/read/:board', csrfProtection, async (req, res) => {
        boardRead(req, res, boards, posts, block, perm, boardcomment, gongji)
    })
    app.get('/board/:board', async (req, res) => {
        boardList(false, req, res, boards, posts, block, perm, gongji, null)
    })
    app.post('/board/AJAX/gechu', csrfProtection, async (req, res) => {
        gechu(req, res, boards, posts, perm, block, boardgechu)
    })
    app.post('/board/AJAX/bichu', csrfProtection, async (req, res) => {
        bichu(req, res, boards, posts, perm, block, boardbichu)
    })
    /*app.get('/board/AJAX/recentposts', async (req, res) =>
    {
        recentPosts(req, res, posts)
    })*/
    app.get('/board/AJAX/gongji', async (req, res) => {
        getgongjilist(req, res, gongji)
    })

    app.get('/admin/gongji',
        csrfProtection,
        asyncRoute(async (req, res) => {
            // TODO move this to extension. Why is it even here??
            const username = req.session.username
            if (username === undefined) {
                renderError(req, res, { description: '로그인이 필요합니다.', returnLink: '/login', returnName: '로그인 페이지', statusCode: 404 })
                return
            }

            const p = await global.db.perm.findOne({ where: { username, perm: 'board' } })
            if (!p) {
                renderError(req, res, { description: 'You do not have a board permission.', returnLink: '/admin', returnName: 'the admin page' })
                return
            }

            const html = await ejs.renderFile(__dirname + '/views/gongji.ejs', { csrfToken: req.csrfToken() })
            renderView(req, res, {
                title: '게시판 공지 변경',
                content: html,
                username,
                ipaddr: req.ipAddress
            })
        })
    )

    app.post('/admin/gongji',
        csrfProtection,
        asyncRoute(async (req, res) => {
            await gongjiAdmin(req, res, global.db.boardgongji)
        })
    )
}
