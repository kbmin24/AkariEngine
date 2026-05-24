import { renderTemplateInLayout } from '../../utils/httpHelper.js'

export default async (req, res) => {
    let adminMenuItems = [
        {
            id: 'wikimgmttools',
            title: res.__('wikimgmttools'),
            entries: [
                {
                    id: 'grant',
                    href: '/admin/grant',
                    title: res.__('grant')
                },
                {
                    id: 'blockUser',
                    href: '/admin/blockuser',
                    title: res.__('blockUser')
                },
                {
                    id: 'blockIP',
                    href: '/admin/blockip',
                    title: res.__('blockIpAddr')
                },
                {
                    id: 'loginhistory',
                    href: '/admin/loginhistory',
                    title: res.__('loginhistory')
                },
                {
                    id: 'hideRevision',
                    href: '/admin/hiderev',
                    title: res.__('hiderev')
                },
                {
                    id: 'devmenu', 
                    href: '/admin/developer',
                    title: res.__('devmenu')
                }
            ]
        }
    ]

    // hooks
    for (const hook of global.hooks.adminMenu) {
        await hook(req, res, adminMenuItems)
    }
    await renderTemplateInLayout(req, res, 'admin/index.ejs', { adminMenuItems }, {
        title: res.__('admintools')
    })
}