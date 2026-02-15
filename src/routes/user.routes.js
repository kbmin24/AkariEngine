const express = require('express')
const paths = require('../utils/paths')

const router = express.Router()

module.exports = () => {
    router.get('/whoami', (req, res) =>
    {
        load('view.js')(req, res,{
            title: 'You are',
            content: `${req.session.username}<br>IP Address: ${req.ipAddress}`,
            username: req.session.username,
            ipaddr: req.ipAddress
        })
    })

    return router
}
