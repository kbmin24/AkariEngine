import { describe, expect, jest, test } from '@jest/globals'
import UserService from './UserService.js'

const createService = () => {
    const userRepository = {
        findByUsername: jest.fn(),
        exists: jest.fn(),
        existsCaseInsensitive: jest.fn(),
        createUser: jest.fn().mockResolvedValue({ username: 'firstuser' }),
        count: jest.fn().mockResolvedValue(1),
        updatePassword: jest.fn(),
    }
    const permissionRepo = {
        grantPermission: jest.fn().mockResolvedValue(undefined),
    }
    const permissionService = {
        requireEveryoneAccess: jest.fn().mockResolvedValue(undefined),
        permissionRepo,
    }
    const settingsRepository = {
        getSetting: jest.fn(),
        setSetting: jest.fn(),
    }

    return {
        service: new UserService(permissionService, userRepository, settingsRepository),
        userRepository,
        permissionService,
        permissionRepo,
    }
}

describe('UserService.register', () => {
    test('grants admin and grant permissions to the first registered user', async () => {
        const { service, userRepository, permissionRepo } = createService()

        const user = await service.register('127.0.0.1', 'firstuser', 'password123')

        expect(userRepository.createUser).toHaveBeenCalledTimes(1)
        expect(userRepository.count).toHaveBeenCalledTimes(1)
        expect(permissionRepo.grantPermission).toHaveBeenCalledWith('firstuser', 'grant', 'firstuser')
        expect(permissionRepo.grantPermission).toHaveBeenCalledWith('firstuser', 'admin', 'firstuser')
        expect(permissionRepo.grantPermission).toHaveBeenCalledTimes(2)
    })

    test('does not grant admin permissions when another user already exists', async () => {
        const { service, userRepository, permissionRepo } = createService()
        userRepository.count.mockResolvedValue(2)

        await service.register('127.0.0.1', 'seconduser', 'password123')

        expect(permissionRepo.grantPermission).not.toHaveBeenCalled()
    })
})
