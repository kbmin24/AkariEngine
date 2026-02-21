module.exports = async (app, registerHook, registerDB) =>
{
    //load DBs
    registerDB('boards', require(__dirname + '/models/boards.model.js'))
    registerDB('boardPosts', require(__dirname + '/models/boardPost.model.js'))
    registerDB('boardgechu', require(__dirname + '/models/boardgechu.model.js'))
    registerDB('boardbichu', require(__dirname + '/models/boardbichu.model.js'))
    registerDB('boardcomment', require(__dirname + '/models/boardcomment.model.js'))
    registerDB('boardfiles', require(__dirname + '/models/boardfiles.model.js'))
    registerDB('boardgongji', require(__dirname + '/models/boardgongji.model.js'))

    //call router
    require(__dirname + '/router.js')(app, global.sequelize, global.csrfProtection)
}