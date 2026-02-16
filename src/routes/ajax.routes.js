const express = require('express')
const paths = require('../utils/paths')

const router = express.Router()
const load = (...segments) => require(paths.resolve(...segments))
const asyncRoute = (handler) => (req, res, next) => Promise.resolve(handler(req, res, next)).catch(next)

module.exports = () => {
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
