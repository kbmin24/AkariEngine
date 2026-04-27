class LoginHistoryService {
    constructor(loginHistoryRepository, adminlogRepository) {
        this.loginHistoryRepository = loginHistoryRepository
        this.adminlogRepository = adminlogRepository
    }

    async getLoginHistoryForUser(targetUsername, { viewedBy }) {
        await this.loginHistoryRepository.pruneOldRecords()
        await this.adminlogRepository.insertLog(viewedBy, `viewed login history of ${targetUsername}`)
        return this.loginHistoryRepository.findByUsername(targetUsername)
    }
}

export default LoginHistoryService
