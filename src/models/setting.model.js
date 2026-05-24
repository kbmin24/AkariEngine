import { DataTypes } from 'sequelize'

export default (sequelize) => {
    return sequelize.define('setting',
        {
            user:
            {
                type: DataTypes.STRING
            },
            key:
            {
                type: DataTypes.STRING
            },
            value:
            {
                type: DataTypes.TEXT
            }
        },
        {
            indexes: [
                {
                    using: 'BTREE',
                    fields: ['user', 'key']
                }
            ]
        })
};