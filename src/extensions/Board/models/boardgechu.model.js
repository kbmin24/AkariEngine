const {DataTypes} = require('sequelize')
module.exports = (sequelize) =>
{
    return sequelize.define('boardgechu',
    {
        boardID:
        {
            type: DataTypes.STRING
        },
        postID:
        {
            type: DataTypes.INTEGER
        },
        userID:
        {
            type: DataTypes.STRING
        },
        userIP:
        {
            type: DataTypes.STRING
        }
    })
}