module.exports = async (req, res, boards, posts, perm, block, boardgechu) =>
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

    let gechuSearchOptions = {
        boardID: boardID,
        postID: postID,
        userIP: req.headers['x-forwarded-for'] || req.socket.remoteAddress
    }
    if (req.session.username) gechuSearchOptions['userID'] = req.session.username
    if (await boardgechu.findOne({where: gechuSearchOptions}))
    {
        res.json({status: 'error', message: '이미 추천하셨습니다.'})
        return
    }

    post = await post.update({gechu: post.gechu + 1})


    //write gechu log
    let boardGechuOptions = {
        boardID: boardID,
        postID: postID,
        userIP: req.headers['x-forwarded-for'] || req.socket.remoteAddress
    }
    if (req.session.username) boardGechuOptions['userID'] = req.session.username

    await boardgechu.create(boardGechuOptions)

    let resJSON = {status: 'success', newGechu: post.gechu, newBichu: post.bichu}
    res.json(resJSON)
}