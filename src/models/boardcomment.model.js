const {DataTypes} = require('sequelize')
module.exports = (sequelize) =>
{
    return sequelize.define(
        'boardComment',
        {
            boardID:
            {
                type: DataTypes.STRING
            },
            postID:
            {
                type: DataTypes.INTEGER
            },
            commentDepth:
            {
                type: DataTypes.INTEGER
            },
            doneBy:
            {
                type: DataTypes.STRING
            },
            doneIP:
            {
                type: DataTypes.STRING
            },
            ipPW:
            {
                type: DataTypes.STRING
            },
            ipPWsalt:
            {
                type: DataTypes.STRING
            },
            comment:
            {
                type: DataTypes.TEXT
            },
            parentCommentID:
            {
                type: DataTypes.INTEGER
            },
            isDeleted:
            {
                type: DataTypes.BOOLEAN
            }
        },
        {
            indexes:
            [
                {
                    unique: false,
                    fields: ['boardID', 'postID']
                }
            ]
        }
    )
}