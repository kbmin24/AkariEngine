class ViewcountService {
    constructor(viewcountRepo) {
        this.viewcountRepo = viewcountRepo
    }

    async getViewRankViewModel() {
        const rank = await this.viewcountRepo.findTopPages(30)
        return { rank }
    }

    async incrementViewCount(title) {
        return this.viewcountRepo.incrementForTitle(title)
    }
}

export default ViewcountService
