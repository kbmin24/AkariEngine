import { DataTypes } from 'sequelize'

export default (sequelize) => {
    return sequelize.define('permissions',
        {
            username:
            {
                allowNull: false,
                type: DataTypes.STRING,
            },
            perm:
            {
                allowNull: false,
                type: DataTypes.STRING,
            },
            givenby:
            {
                allowNull: true,
                type: DataTypes.STRING,
            },
        },
        {
            indexes: [
                {
                    using: 'BTREE',
                    fields: ['username', 'perm']
                }
            ]
        })
};