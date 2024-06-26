const {DataTypes} = require('sequelize')
module.exports = (sequelize) =>
{
    return sequelize.define('page',
    {
        title:
        {
            allowNull: false,
            type: DataTypes.STRING,
            unique: true,
        },
        content:
        {
            type: DataTypes.TEXT
        },
        currentRev:
        {
            type: DataTypes.INTEGER
        },
        deleted:
        {
            type: DataTypes.BOOLEAN
        }
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
            }
        ]
    }
    )
}