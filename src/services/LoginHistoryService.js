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

    async createLoginRecord(username, ipaddr) {
        await this.loginHistoryRepository.pruneOldRecords()
        await this.loginHistoryRepository.createNewRecord(username, ipaddr)
    }
}

export default LoginHistoryService
