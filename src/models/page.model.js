import { DataTypes } from 'sequelize'

export default (sequelize) =>
{
    return sequelize.define('page',
    {
        title:
        {
            allowNull: false,
            type: DataTypes.STRING,
            unique: true,
        },
        content:
        {
            type: DataTypes.TEXT
        },
        currentRev:
        {
            type: DataTypes.INTEGER
        },
        deleted:
        {
            type: DataTypes.BOOLEAN
        }
    },
    {
        indexes:
        [
            {
                type: 'FULLTEXT',
                fields: ['title']
            },
            {
                unique: true,
                fields: ['title']
            }
        ]
    }
    )
};