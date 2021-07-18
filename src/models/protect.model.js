const {DataTypes} = require('sequelize')
module.exports = (sequelize) =>
{
    return sequelize.define('protect',
    {
        title:
        {
            allowNull: false,
            type: DataTypes.STRING
        },
        revision:
        {
            allowNull: true,
            type: DataTypes.INTEGER
        },
        task:
        {
            allowNull: false,
            type: DataTypes.STRING
        },
        protectionLevel:
        {
            type: DataTypes.STRING
        }
    })
}