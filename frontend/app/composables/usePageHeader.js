const DEFAULTS = {
    title: '',
    titleInfo: null,
    pagename: null,
    isPage: false,
    pageMode: 'page',
    updatedAt: null,
    description: null,
}

export const usePageHeader = () => {
    const header = useState('pageHeader', () => ({ ...DEFAULTS }))

    const setPageHeader = (data) => {
        header.value = { ...DEFAULTS, ...data }
    }

    const clearPageHeader = () => {
        header.value = { ...DEFAULTS }
    }

    return { header, setPageHeader, clearPageHeader }
}
