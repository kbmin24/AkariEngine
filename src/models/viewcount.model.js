const {DataTypes} = require('sequelize')
module.exports = (sequelize) =>
{
    return sequelize.define('viewcount',
    {
        title:
        {
            type: DataTypes.STRING
        },
        count:
        {
            type: DataTypes.INTEGER
        }
    })
}