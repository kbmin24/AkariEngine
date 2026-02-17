const { DataTypes } = require('sequelize')
module.exports = (sequelize) => {
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
}