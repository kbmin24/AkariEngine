const {DataTypes} = require('sequelize')
module.exports = (sequelize) =>
{
    return sequelize.define('setting',
    {
        user:
        {
            type: DataTypes.STRING
        },
        key:
        {
            type: DataTypes.STRING
        },
        value:
        {
            type: DataTypes.TEXT
        }
    })
}