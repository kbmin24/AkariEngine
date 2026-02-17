const express = require('express')
const { load, asyncRoute } = require('../utils/httpHelper')

module.exports = () => {
    const router = express.Router()
    router.get('/ajax/autocomplete', asyncRoute(async (req, res) => {
        await load('AJAX', 'pageautocomplete.js')(req, res, global.db.pages)
    }))

    router.get('/ajax/recentchanges', asyncRoute(async (req, res) => {
        await load('AJAX', 'recentchanges.js')(req, res, global.db.recentchanges)
    }))

    router.get('/ajax/username', asyncRoute(async (req, res) => {
        await load('AJAX', 'username.js')(req, res, global.db.users)
    }))

    return router
}
