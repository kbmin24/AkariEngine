export default {
    name: 'PERMISSIONS',
    shortDesc: 'Lists permissions for all users or a specific user.',
    longDesc: 'Usage: PERMISSIONS [username]\nLists all permissions. If a username is given, shows only that user\'s permissions.',
    async f(command, stdout, username, ipAddress, options = {}) {
        const cmdSplit = command.split(' ')
        const searchOptions = { order: [['username', 'DESC']] }
        if (cmdSplit[1]) searchOptions.where = { username: cmdSplit[1] }

        const permissions = await global.db.perm.findAll(searchOptions)
        let usernameNow = ''
        for (const element of permissions) {
            if (element.username !== usernameNow) {
                if (usernameNow !== '') stdout('\n')
                stdout(element.username + ': ')
            }
            usernameNow = element.username
            stdout(element.perm + ' ')
        }
        stdout('\n')
    }
}