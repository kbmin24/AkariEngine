module.exports = async (req, res, boards, posts, perm, block, boardbichu) =>
{
    let boardID = req.body.boardID
    let postID = req.body.postID * 1
    const boardNow = await boards.findOne({where: {boardID: boardID}})
    if (!boardNow)
    {
        res.json({status: 'error', message: '잘못된 접근입니다.'})
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
        res.json({status: 'error', message: '잘못된 접근입니다.'})
        return
    }
    let post = await posts.findOne({where: {id: postID}})
    if (!post)
    {
        res.json({status: 'error', message: '게시물이 삭제되었습니다.'})
        return
    }

    let bichuSearchOptions = {
        boardID: boardID,
        postID: postID,
        userIP: req.headers['x-forwarded-for'] || req.socket.remoteAddress
    }
    if (req.session.username) bichuSearchOptions['userID'] = req.session.username
    if (await boardbichu.findOne({where: bichuSearchOptions}))
    {
        res.json({status: 'error', message: '이미 비추천하셨습니다.'})
        return
    }

    post = await post.update({bichu: post.bichu + 1})


    //write bichu log
    let boardBichuOptions = {
        boardID: boardID,
        postID: postID,
        userIP: req.headers['x-forwarded-for'] || req.socket.remoteAddress
    }
    if (req.session.username) boardBichuOptions['userID'] = req.session.username

    await boardbichu.create(boardBichuOptions)

    let resJSON = {status: 'success', newGechu: post.gechu, newBichu: post.bichu}
    res.json(resJSON)
}