// service for misc admin functions
class AdminService {
    constructor(adminlogRepository) {
        this.adminlogRepository = adminlogRepository
    }

    /**
     * Finds and counts admin logs.
     * @param {Object} options - Options for finding logs
     * @param {string} [options.doneBy] - Filter by username who performed the action
     * @param {string} [options.job] - Filter by job (i.e. action) done
     * @param {number} [options.limit=30] - Number of logs to return
     * @param {number} [options.offset=0] - Number of logs to skip for pagination
     * @returns {Promise<{logs: Array, count: number}>} Logs and total count
     */
    async getAdminLogAndCount({ doneBy, job, from }) {
        return await this.adminlogRepository.findLogsAndCount({ doneBy, job, offset: from })
    }
}

export default AdminService