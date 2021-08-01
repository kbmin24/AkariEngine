const {DataTypes} = require('sequelize')
module.exports = (sequelize) =>
{
    return sequelize.define('updateTime',
    {
        key:
        {
            type: DataTypes.STRING
        },
        value:
        {
            type: DataTypes.DATE
        }
    })
}