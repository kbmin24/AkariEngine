const {DataTypes} = require('sequelize')
module.exports = (sequelize) =>
{
    return sequelize.define('thread',
    {
        threadID:
        {
            allowNull: false,
            type: DataTypes.STRING,
            unique: true,
        },
        threadTitle:
        {
            type: DataTypes.STRING
        },
        pagename:
        {
            type: DataTypes.STRING
        },
        isOpen:
        {
            type: DataTypes.BOOLEAN
        }
    })
}