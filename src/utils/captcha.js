import config from '../config/index.js'

// todo: move genCaptcha to middleware too

async function genCaptcha()
{
    if (!config.settings.reCAPTCHA_enabled) return ""
    return `<div class="g-recaptcha" data-sitekey="${config.settings.reCAPTCHA}"></div>`
}

export {
    genCaptcha
}
