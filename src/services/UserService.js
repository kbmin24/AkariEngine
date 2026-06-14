import crypto from 'node:crypto'
import { promisify } from 'node:util'
import { ValidationError, AuthenticationRequiredError } from './errors.js'

const pbkdf2 = promisify(crypto.pbkdf2)
const HASH_ITERATIONS = 10000
const HASH_LENGTH = 64
const HASH_DIGEST = 'sha512'

class UserService {
    constructor(permissionService, userRepository, settingsRepository) {
        this.permissionService = permissionService
        this.userRepository = userRepository
        this.settingsRepository = settingsRepository
    }

    async findByUsername(username) {
        return this.userRepository.findByUsername(username)
    }

    async exists(username) {
        return this.userRepository.exists(username)
    }

    async existsCaseInsensitive(username) {
        return this.userRepository.existsCaseInsensitive(username)
    }

    async hashPassword(password, salt) {
        const hash = await pbkdf2(password, salt, HASH_ITERATIONS, HASH_LENGTH, HASH_DIGEST)
        return hash.toString('base64')
    }

    async register(ipAddress, username, password) {
        this.permissionService.requireEveryoneAccess(null, { ipAddress })
        const salt = crypto.randomBytes(64).toString('base64')
        const hashedPassword = await this.hashPassword(password, salt)
        return this.userRepository.createUser(username, hashedPassword, salt)
    }

    async verifyPassword(username, password) {
        const user = await this.userRepository.findByUsername(username)
        if (!user) return false
        const hash = await this.hashPassword(password, user.salt)
        return hash === user.password
    }

    async getSkin(username) {
        const setting = await this.settingsRepository.getSetting(username, 'skin')
        return setting?.value ?? null
    }

    async changeSkin(username, skinName) {
        await this.settingsRepository.setSetting(username, 'skin', skinName)
    }

    async changePassword(username, oldPassword, newPassword) {
        if (!username) throw new AuthenticationRequiredError()

        const user = await this.userRepository.findByUsername(username)
        if (!user) throw new AuthenticationRequiredError()

        const oldHash = await this.hashPassword(oldPassword, user.salt)
        if (oldHash !== user.password) {
            throw new ValidationError('Invalid Password')
        }

        const newHash = await this.hashPassword(newPassword, user.salt)
        await this.userRepository.updatePassword(username, newHash, user.salt)
    }
}

export default UserService
