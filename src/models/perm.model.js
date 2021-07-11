const {DataTypes} = require('sequelize')
module.exports = (sequelize) =>
{
    return sequelize.define('permissions',
    {
        username:
        {
            allowNull: false,
            type: DataTypes.STRING,
        },
        perm:
        {
            allowNull: false,
            type: DataTypes.STRING,
        },
        givenby:
        {
            allowNull: true,
            type: DataTypes.STRING,
        },
    })
}