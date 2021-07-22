const {DataTypes} = require('sequelize')
module.exports = (sequelize) =>
{
    return sequelize.define('block',
    {
        target:
        {
            allowNull: false,
            type: DataTypes.STRING
        },
        targetType:
        {
            allowNull: false,
            type: DataTypes.STRING //EITHER 'ip' OR 'user'
        },
        allowLogin:
        {
            //IP only
            allowNull: true,
            type: DataTypes.BOOLEAN
        },
        isForever:
        {
            allowNull: false,
            type: DataTypes.BOOLEAN
        },
        doneBy:
        {
            type: DataTypes.STRING
        },
        comment:
        {
            type: DataTypes.STRING
        },
        until:
        {
            type: DataTypes.DATE
        }
    })
}