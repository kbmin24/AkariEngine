const {DataTypes} = require('sequelize')
module.exports = (sequelize) =>
{
    return sequelize.define('recentdiscuss',
    {
        id:
        {
            allowNull: false,
            autoIncrement: true,
            primaryKey: true,
            type: DataTypes.INTEGER
        },
        threadname:
        {
            type: DataTypes.STRING
        },
        threadID:
        {
            type: DataTypes.STRING
        },
        pagename:
        {
            type: DataTypes.STRING
        }
    })
}