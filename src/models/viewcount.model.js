import { DataTypes } from 'sequelize'

export default (sequelize) => {
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
        },
        {
            indexes: [
                {
                    unique: true,
                    fields: ['title']
                }
            ]
        })
};