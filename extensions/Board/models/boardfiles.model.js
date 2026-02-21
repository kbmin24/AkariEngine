const {DataTypes} = require('sequelize')
module.exports = (sequelize) =>
{
    return sequelize.define('boardfile',
    {
        boardID:
        {
            type: DataTypes.STRING
        },
        postID:
        {
            type: DataTypes.INTEGER
        },
        fileName:
        {
            type: DataTypes.STRING
        }
    })
}