const {DataTypes} = require('sequelize')
module.exports = (sequelize) =>
{
    return sequelize.define('threadcomment',
    {
        type:
        {
            type: DataTypes.STRING,
        },
        threadID:
        {
            type: DataTypes.STRING
        },
        doneBy:
        {
            type: DataTypes.STRING
        },
        content:
        {
            type: DataTypes.TEXT
        },
        isHidden:
        {
            type: DataTypes.BOOLEAN
        }
    })
}