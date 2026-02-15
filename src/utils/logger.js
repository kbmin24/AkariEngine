let chalk = null

try {
    chalk = require('chalk')
} catch (error) {
    chalk = {
        blue: (text) => text,
        red: (text) => text,
        yellow: (text) => text,
        gray: (text) => text,
        magenta: (text) => text
    }
}

class Logger {
    info(message, meta = {}) {
        console.log(chalk.blue('[INFO]'), message, meta)
    }

    error(message, error = null) {
        console.error(chalk.red('[ERROR]'), message)
        if (error) {
            console.error(chalk.red(error.stack || error))
        }
    }

    warn(message, meta = {}) {
        console.warn(chalk.yellow('[WARN]'), message, meta)
    }

    debug(message, meta = {}) {
        if (process.env.NODE_ENV !== 'production') {
            console.log(chalk.gray('[DEBUG]'), message, meta)
        }
    }

    admin(action, username, details = {}) {
        console.log(chalk.magenta('[ADMIN]'), `${username}: ${action}`, details)
    }
}

module.exports = new Logger()
