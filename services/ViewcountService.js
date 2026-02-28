class ViewcountService {
    constructor(viewcountRepo) {
        this.viewcountRepo = viewcountRepo
    }

    async getViewRankViewModel() {
        const rank = await this.viewcountRepo.findTopPages(30)
        return { rank }
    }
}

export default ViewcountService
