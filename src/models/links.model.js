const {DataTypes} = require('sequelize')
module.exports = (sequelize) =>
{
    return sequelize.define('link',
    {
        source:
        {
            allowNull: false,
            type: DataTypes.STRING
        },
        dest:
        {
            allowNull: false,
            type: DataTypes.STRING
        }
    })
}