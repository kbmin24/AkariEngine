const {DataTypes} = require('sequelize')
module.exports = (sequelize) =>
{
    return sequelize.define('boardPost',
    {
        boardID:
        {
            type: DataTypes.STRING
        },
        title:
        {
            type: DataTypes.STRING
        },
        writtenBy:
        {
            type: DataTypes.STRING
        },
        writtenIP:
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
        content:
        {
            type: DataTypes.TEXT
        },
        viewCount:
        {
            type: DataTypes.INTEGER
        },
        commentCount:
        {
            type: DataTypes.INTEGER
        },
        gechu:
        {
            type: DataTypes.INTEGER
        },
        bichu:
        {
            type: DataTypes.INTEGER
        },
    },
    {
        indexes:
        [
            {
                type: 'FULLTEXT',
                fields: ['title']
            },
            {
                type: 'FULLTEXT',
                fields: ['content']
            },
            {
                type: 'FULLTEXT',
                fields: ['title', 'content']
            },
            {
                type: 'FULLTEXT',
                fields: ['writtenBy']
            }
        ]
    })
}