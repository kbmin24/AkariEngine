let fs = require('fs')
module.exports = async (req, res, username, users, pages, recentchanges, history, perm, files, category) =>
{
    if (username === undefined)
    {
        require(global.path + '/error.js')(req, res, null, '로그인이 필요합니다.', '/login', '로그인 페이지', 403, 'ko')
        return
    }
    if (req.params.name === undefined)
    {
        require(global.path + '/error.js')(req, res, null, '페이지가 지정되지 않았습니다.', '/', '메인 페이지', 404, 'ko')
        return
    }
    let isaFile = req.params.name.toLowerCase().startsWith('file:')
    let filename = ''
    if (isaFile)
    {
        if (!(perm.findOne({where: {username: username, perm: 'deletefile'}})))
        {
            require(global.path + '/error.js')(req, res, null, '파일 삭제 권한이 필요합니다.', '/login', '로그인 페이지', 403, 'ko')
            return
        }
        filename = /File:(.*)/.exec(req.params.name)[1]
        if (!(filename.length > 0))
        {
            require(global.path + '/error.js')(req, res, null, '파일 삭제 중 알 수 없는 오류가 발생하였습니다.', '/', '로그인 페이지', 500, 'ko')
            return
        }
        files.destroy({where: {filename: filename}})
        fs.unlinkSync(global.path + '/public/uploads/' + filename)
    }
    perm.findOne({where: {username: username, perm: 'deletepage'}}).then(async p =>
    {
        if (p)
        {
            pages.findOne({where: {title: req.params.name}}).then(async page =>
            {
                var doneby = req.session.username
                if (doneby === undefined) doneby = req.headers['x-forwarded-for'] || req.socket.remoteAddress
                if (page) //if page exists
                {
                    const oldLength = page.content.length
                    //pages.destroy({where: {title: req.params.name}})
                    //history.destroy({where: {page: req.params.name}})
                    await page.update({content: '', currentRev: page.currentRev + 1, deleted: true})
                    await category.destroy({where: {page: req.params.name}})
                    await global.db.links.destroy({
                        where: {source: req.params.name}
                    })
                    recentchanges.create(
                    {
                        page: req.params.name,
                        doneBy: doneby,
                        bytechange: -oldLength,
                        comment: req.body.comment,
                        type: 'delete'
                    })
                    history.create(
                    {
                        page: req.params.name,
                        rev: page.currentRev + 1,
                        bytechange: -oldLength,
                        editedby: doneby,
                        comment: req.body.comment,
                        type: 'delete'
                    })
                    res.redirect('/')
                }
                else
                {
                    //error!
                    require(global.path + '/error.js')(req, res, null, '문서가 존재하지 않습니다.', '/', '메인 페이지', 404, 'ko')
                }
            })
        }
        else
        {
            require(global.path + '/error.js')(req, res, null, '문서 삭제 권한이 필요합니다.', '/login', '로그인 페이지', 403, 'ko')
        }
    })
}