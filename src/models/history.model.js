const {DataTypes} = require('sequelize')
module.exports = (sequelize) =>
{
    return sequelize.define('history',
    {
        page:
        {
            allowNull: false,
            type: DataTypes.STRING,
        },
        rev:
        {
            //r?
            allowNull: false,
            type: DataTypes.INTEGER
        },
        content:
        {
            type: DataTypes.TEXT
        },
        bytechange:
        {
            type: DataTypes.INTEGER
        },
        editedby:
        {
            type: DataTypes.STRING //VARCHAR(255)
        },
        comment:
        {
            type: DataTypes.STRING
        },
        type:
        {
            type: DataTypes.STRING
        },
        movedFrom:
        {
            type: DataTypes.STRING,
            allowNull: true
        },
        movedTo:
        {
            type: DataTypes.STRING,
            allowNull: true
        },
        revertTo:
        {
            type: DataTypes.INTEGER,
            allowNull: true
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