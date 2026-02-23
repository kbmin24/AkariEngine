import boardsModel from './models/boards.model.js'
import boardPostModel from './models/boardPost.model.js'
import boardgechuModel from './models/boardgechu.model.js'
import boardbichuModel from './models/boardbichu.model.js'
import boardcommentModel from './models/boardcomment.model.js'
import boardfilesModel from './models/boardfiles.model.js'
import boardgongjiModel from './models/boardgongji.model.js'
import boardRouter from './router.js'

export default async (app, registerHook, registerDB) =>
{
    //load DBs
    registerDB('boards', boardsModel)
    registerDB('boardPosts', boardPostModel)
    registerDB('boardgechu', boardgechuModel)
    registerDB('boardbichu', boardbichuModel)
    registerDB('boardcomment', boardcommentModel)
    registerDB('boardfiles', boardfilesModel)
    registerDB('boardgongji', boardgongjiModel)

    //call router
    boardRouter(app, global.sequelize, global.csrfProtection)
};
