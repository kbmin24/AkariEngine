const DEFAULTS = {
    title: '',
    titleLink: null,
    titleInfo: null,
    pagename: null,
    isPage: false,
    isFile: false,
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
