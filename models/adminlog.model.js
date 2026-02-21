const {DataTypes} = require('sequelize')
module.exports = (sequelize) =>
{
    return sequelize.define('adminlog',
    {
        username:
        {
            allowNull: false,
            type: DataTypes.STRING
        },
        job:
        {
            type: DataTypes.TEXT
        }
    })
}