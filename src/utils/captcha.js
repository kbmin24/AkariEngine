import config from '../config/index.js'

const genCaptcha = () =>
{
    if (!config.settings.turnstile_enabled) return ""
    return config.settings.turnstile_sitekey
}

export {
    genCaptcha
}
