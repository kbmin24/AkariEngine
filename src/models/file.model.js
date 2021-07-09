const {DataTypes} = require('sequelize')
module.exports = (sequelize) =>
{
    return sequelize.define('file',
    {
        filename:
        {
            allowNull: false,
            type: DataTypes.STRING,
            unique: true,
        },
        uploader:
        {
            type: DataTypes.STRING
        },
        explanation:
        {
            type: DataTypes.TEXT
        }
    })
}