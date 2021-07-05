const {DataTypes} = require('sequelize')
module.exports = (sequelize) =>
{
    return sequelize.define('user',
    {
        id:
        {
            allowNull: false,
            autoIncrement: true,
            primaryKey: true,
            type: DataTypes.INTEGER
        },
        username:
        {
            allowNull: false,
            type: DataTypes.STRING,
            unique: true,
            validate:
            {
                is: /^\w{3,}$/
            }
        },
        password:
        {
            //hash
            allowNull: false,
            type: DataTypes.STRING
        },
        salt:
        {
            allowNull: false,
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