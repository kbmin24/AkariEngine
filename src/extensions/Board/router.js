const ejs = require('ejs')
module.exports = async (app, sequelize, csrfProtection) => {
    /*const users = require(global.path + '/models/user.model.js')(sequelize)
    const boards = require(global.path + '/models/boardBoard.model.js')(sequelize)
    const posts = require(global.path + '/models/boardPost.model.js')(sequelize)
    const block = require(global.path + '/models/block.model.js')(sequelize)
    const perm = require(global.path + '/models/perm.model.js')(sequelize)
    const boardgechu = require(global.path + '/models/boardgechu.model.js')(sequelize)
    const boardbichu = require(global.path + '/models/boardbichu.model.js')(sequelize)
    const boardcomment = require(global.path + '/models/boardcomment.model.js')(sequelize)
    const boardfiles = require(global.path + '/models/boardfiles.model.js')(sequelize)
    const gongji = require(global.path + '/models/boardgongji.model.js')(sequelize)*/

    let users = global.db.users
    let boards = global.db.boards
    let posts = global.db.boardPosts
    let block = global.db.block
    let perm = global.db.perm
    let boardgechu = global.db.boardgechu //upvote
    let boardbichu = global.db.boardbichu //downvote
    let boardcomment = global.db.boardcomment
    let boardfiles = global.db.boardfiles
    let gongji = global.db.boardgongji

    app.get('/board/', async (req, res) =>
    {
        require(__dirname + '/boardHome.js')(req, res, boards, posts)
    })
    app.get('/board/write/:board', csrfProtection, async (req, res) =>
    {
        //존재하는 게시판인지 확인
        const boardNow = await boards.findOne({where: {boardID: req.params.board}})
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
        const captchaSVG = await require(global.path + '/tools/captcha.js').genCaptcha(req)
        if (!(boardNow))
        {
            require(global.path + '/error.js')(req, res, null, '존재하지 않는 게시판입니다.', '/board', '게시판 홈', 404, 'ko')
            return
        }
        ejs.renderFile(__dirname + '/views/write.ejs',
        {
            board: boardNow.boardID,
            username: req.session.username,
            captcha: captchaSVG,
            csrfToken: req.csrfToken()
        }, (err, html) => 
        {
            if (err)
            {
                console.error(err)
                res.writeHead(500).write('Internal Server Error')
                return
            }
            require(global.path + '/view.js')(req, res,
            {
                title: boardNow.boardTitle,
                titleLink: `/board/${boardNow.boardID}`,
                description: global.conf.boardDescriptions.hasOwnProperty(boardNow.boardID) ? global.conf.boardDescriptions[boardNow.boardID] : '',
                content: html,
                username: req.session.username,
                ipaddr: (req.headers['x-forwarded-for'] || req.socket.remoteAddress),
                
            })
        })
    })
    app.post('/board/write/:board', csrfProtection, async(req, res) =>
    {
        require(__dirname + '/write.js')(req, res, boards, posts, block, perm, boardfiles)
    })

    let multer = require('multer')
    let path = require('path')
    let storage = multer.diskStorage(
        {
            destination: (req, file, cb) => {cb(null, global.path + '/public/boarduploads/')}
        }
    )
    function checkFileType(file, cb)
    {
        //https://stackoverflow.com/questions/60408575/how-to-validate-file-extension-with-multer-middleware
        const filetypes = /jpg|jpeg|jfif|pjpeg|pjp|png|gif|dib|bmp|webp|tif|tiff/i
        const ext = filetypes.test(path.extname(file.originalname).toLowerCase())
        const mime = filetypes.test(file.mimetype)
        if (mime && ext)
        {
            return cb(null,true)
        }
        else
        {
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
        fileFilter: async (req, file, cb) =>
        {
            const fileSize = parseInt(req.headers['content-length'])
            if (fileSize > 4 * 1024 * 1024)
            {
                let e = new Error('File must be 4MB or less.')
                e.code = 'BOARD_LIMIT_FILE_SIZE'
                cb(e)
                return
            }
            checkFileType(file, cb)
        }
    })
    let fs = require('fs')
    app.post('/board/upload', boardUpload.single('upload'), async (req, res) =>
    {
        fs.readFile(req.file.path, (err, data) =>
        {
            if (err)
            {
                res.send(
                    {
                        error: '알 수 없는 오류가 발생하여 파일 업로드에 실패하였습니다.'
                    }
                )
            }
            else
            {
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
    app.get('/board/deletepost', csrfProtection, async (req, res) =>
    {   
        ejs.renderFile(__dirname + '/views/deletePostVerify.ejs',
        {
            boardID: req.query.board,
            postID: req.query.id,
            username: req.session.username,
            passReq: req.query.passReq,
            csrfToken: req.csrfToken()
        }, (err, html) => 
        {
            if (err)
            {
                console.error(err)
                res.writeHead(500).write('Internal Server Error')
                return
            }
            require(global.path + '/view.js')(req, res,
            {
                title: '정말로 글을 삭제하시겠습니까?',
                content: html,
                username: req.session.username,
                ipaddr: (req.headers['x-forwarded-for'] || req.socket.remoteAddress),
                
            })
        })
    })
    app.post('/board/deletepost', csrfProtection, async (req, res) =>
    {
        let isAdmin = (req.session.username && await perm.findOne({where:
            {
                username: req.session.username, 
                perm: 'board'
            }}) !== null ) === true
        if (!req.body.postid)
        {
            require(global.path + '/error.js')(req, res, null, '잘못된 접근입니다.', '/board', '게시판 홈', 403, 'ko')
            return
        }
        const boardNow = await boards.findOne({where: {boardID: req.body.boardid}})

        let post = await posts.findOne({where: {boardID: req.body.boardid, idAtBoard: req.body.postid}})
        if (!post)
        {
            require(global.path + '/error.js')(req, res, null, '이미 삭제된 글입니다.', '/board', '게시판 홈', 403, 'ko')
            return
        }
        if (post.writtenIP && !isAdmin)
        {
            //check PW
            const crypto = require('crypto')
            const saltedPW = crypto.pbkdf2Sync(req.body.pw, post.ipPWsalt, 10000, 64, 'sha512')
            if (saltedPW.toString('base64') != post.ipPW)
            {
                require(global.path + '/error.js')(req, res, null, '비밀번호가 틀렸습니다.', 'javascript:window.history.back()', '이전 페이지', 403, 'ko')
                return
            }
        }
        else
        {
            if (!isAdmin && post.writtenBy != req.session.username)
            {
                require(global.path + '/error.js')(req, res, null, '잘못된 접근입니다.', '/board', '게시판 홈', 403, 'ko')
                return
            }
        }
        //delete relevant images from the disk
        for (let f of await boardfiles.findAll({where: {boardID: req.body.boardid, postID: req.body.postid}}))
        {
            try
            {
                fs.unlinkSync(global.path + '/public/boarduploads/' + f.fileName)
            }
            catch
            {
                
            }
        }

        //delete the comment
        await boardcomment.destroy({where: {boardID: req.body.boardid, postID: post.idAtBoard}})
        await posts.destroy({where: {boardID: req.body.boardid, idAtBoard: req.body.postid}})
        await boardNow.update({postCount: boardNow.postCount - 1})

        res.redirect('/board')
    })
    app.post('/board/writecomment', csrfProtection, async (req, res) =>
    {
        require(__dirname + '/writecomment.js')(req, res, boards, posts, boardcomment, block, perm)
    })
    app.get('/board/deletecomment', csrfProtection, async (req, res) =>
    {   
        ejs.renderFile(__dirname + '/views/deleteCommentVerify.ejs',
        {
            commentID: req.query.id,
            username: req.session.username,
            passReq: req.query.passReq,
            csrfToken: req.csrfToken()
        }, (err, html) => 
        {
            if (err)
            {
                console.error(err)
                res.writeHead(500).write('Internal Server Error')
                return
            }
            require(global.path + '/view.js')(req, res,
            {
                title: '정말로 댓글을 삭제하시겠습니까?',
                content: html,
                username: req.session.username,
                ipaddr: (req.headers['x-forwarded-for'] || req.socket.remoteAddress),
                
            })
        })
    })
    app.post('/board/deletecomment', csrfProtection, async (req, res) =>
    {
        let isAdmin = (req.session.username && await perm.findOne({where:
            {
                username: req.session.username, 
                perm: 'board'
            }}) !== null ) === true
        if (!req.body.commentid)
        {
            require(global.path + '/error.js')(req, res, null, '잘못된 접근입니다.', '/board', '게시판 홈', 403, 'ko')
            return
        }
        let comment = await boardcomment.findOne({where: {id: req.body.commentid}})
        if (!comment || comment.isDeleted)
        {
            require(global.path + '/error.js')(req, res, null, '이미 삭제된 댓글입니다.', '/board', '게시판 홈', 403, 'ko')
            return
        }
        if (comment.doneIP && !isAdmin)
        {
            //check PW
            const crypto = require('crypto')
            const saltedPW = crypto.pbkdf2Sync(req.body.pw, comment.ipPWsalt, 10000, 64, 'sha512')
            if (saltedPW.toString('base64') != comment.ipPW)
            {
                require(global.path + '/error.js')(req, res, null, '비밀번호가 틀렸습니다.', 'javascript:window.history.back()', '이전 페이지', 403, 'ko')
                return
            }
        }
        else
        {
            if (!isAdmin && comment.doneBy != req.session.username)
            {
                require(global.path + '/error.js')(req, res, null, '잘못된 접근입니다.', '/board', '게시판 홈', 403, 'ko')
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
    app.get('/board/read/:board', csrfProtection, async (req, res) =>
    {
        require(__dirname + '/read.js')(req, res, boards, posts, block, perm, boardcomment, gongji)
    })
    app.get('/board/:board', async (req, res) =>
    {
        require(__dirname + '/list.js')(false, req, res, boards, posts, block, perm, gongji, null)
    })
    app.post('/board/AJAX/gechu', csrfProtection, async (req, res) =>
    {
        require(__dirname + '/AJAX/gechu.js')(req, res, boards, posts, perm, block, boardgechu)
    })
    app.post('/board/AJAX/bichu', csrfProtection, async (req, res) =>
    {
        require(__dirname + '/AJAX/bichu.js')(req, res, boards, posts, perm, block, boardbichu)
    })
    /*app.get('/board/AJAX/recentposts', async (req, res) =>
    {
        require(__dirname + '/AJAX/recentPosts.js')(req, res, posts)
    })*/
    app.get('/board/AJAX/gongji', async (req, res) =>
    {
        require(__dirname + '/AJAX/getgongjilist.js')(req, res, gongji)
    })
}