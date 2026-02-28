import { DataTypes } from 'sequelize'

export default (sequelize) => {
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
        },
        {
            indexes: [
                                {
                    using: 'BTREE',
                    fields: ['threadID']
                },
            ]
        })
};