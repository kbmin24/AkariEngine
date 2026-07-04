const BACK_LINK = 'javascript:history.back()'
const LOGIN_LINK = '/login'

function asyncRoute(handler) {
    return (req, res, next) => Promise.resolve(handler(req, res, next)).catch(next)
}

export {
    asyncRoute,
    BACK_LINK,
    LOGIN_LINK
}
