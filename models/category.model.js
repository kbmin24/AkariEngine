import { DataTypes } from 'sequelize'

export default (sequelize) => {
    return sequelize.define('category',
        {
            page:
            {
                type: DataTypes.STRING
            },
            category:
            {
                type: DataTypes.STRING
            }
        },
        {
            indexes: [
                {
                    using: 'BTREE',
                    fields: ['page']
                },
                {
                    using: 'BTREE',
                    fields: ['category']
                }
            ]
        }
    )
};