import { DataTypes } from 'sequelize'

export default (sequelize) =>
{
    return sequelize.define('adminlog',
    {
        username:
        {
            allowNull: false,
            type: DataTypes.STRING
        },
        job:
        {
            type: DataTypes.TEXT
        }
    })
};