import { DataTypes } from 'sequelize'

export default (sequelize) =>
{
    return sequelize.define('updateTime',
    {
        key:
        {
            type: DataTypes.STRING
        },
        value:
        {
            type: DataTypes.DATE
        }
    },
    {
        indexes: [
            {
                unique: true,
                fields: ['key']
            }
        ]
    })
};