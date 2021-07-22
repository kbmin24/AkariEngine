const {DataTypes} = require('sequelize')
module.exports = (sequelize) =>
{
    return sequelize.define('loginhistory',
    {
        username:
        {
            type: DataTypes.STRING,
        },
        ipaddr:
        {
            type: DataTypes.STRING
        }
    })
}