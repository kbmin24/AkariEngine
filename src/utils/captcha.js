import config from '../config/index.js'

const genCaptcha = () =>
{
    if (!config.settings.reCAPTCHA_enabled) return ""
    return `<div class="g-recaptcha" data-sitekey="${config.settings.reCAPTCHA}"></div>`
}

export {
    genCaptcha
}
