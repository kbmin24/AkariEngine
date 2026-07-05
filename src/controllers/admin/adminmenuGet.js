export default (req, res) => {
    res.json({
        adminMenuItems: [
            {
                id: 'wikimgmttools',
                titleKey: 'wikimgmttools',
                entries: [
                    { id: 'grant', href: '/admin/grant', titleKey: 'grant' },
                    { id: 'blockUser', href: '/admin/blockuser', titleKey: 'blockUser' },
                    { id: 'blockIP', href: '/admin/blockip', titleKey: 'blockIpAddr' },
                    { id: 'loginhistory', href: '/admin/loginhistory', titleKey: 'loginhistory' },
                    { id: 'hideRevision', href: '/admin/hiderev', titleKey: 'hiderev' },
                    { id: 'devmenu', href: '/admin/developer', titleKey: 'devmenu' }
                ]
            }
        ]
    })
}
