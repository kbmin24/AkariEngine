const {DataTypes} = require('sequelize')
module.exports = (sequelize) =>
{
    return sequelize.define('recentchanges',
    {
        id:
        {
            allowNull: false,
            autoIncrement: true,
            primaryKey: true,
            type: DataTypes.INTEGER
        },
        page:
        {
            allowNull: false,
            type: DataTypes.STRING
        },
        rev:
        {
            type: DataTypes.INTEGER
        },
        doneBy:
        {
            allowNull: false,
            type: DataTypes.STRING
        },
        type:
        {
            type: DataTypes.STRING
        },
        createdAt:
        {
            allowNull: true,
            type: DataTypes.DATE
        },
        updatedAt:
        {
            allowNull: true,
            type: DataTypes.DATE
        }
    })
}