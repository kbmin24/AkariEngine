import cleancategories from './commands/cleancategories.js'
import reindex from './commands/reindex.js'
import genbacklinks from './commands/genbacklinks.js'
import genpassword from './commands/genpassword.js'
import help from './commands/help.js'
import permissions from './commands/permissions.js'
import whoami from './commands/whoami.js'
import { normalizeIpAddress } from '../utils/ipTools.js'

const commands = new Map(
    [cleancategories, reindex, genbacklinks, genpassword, help, permissions, whoami]
        .map(cmd => [cmd.name.toUpperCase(), cmd])
)

export default async (socket, command) => {
    const stdout = (data) => socket.emit('output', data)
    try {
        const username = socket.handshake.session.username
        const ipAddress = normalizeIpAddress(socket.handshake.address)
        if (!(await global.db.perm.findOne({ where: { username, perm: 'developer' } }))) return

        stdout(`>>> ${command}\n`)

        const cmdName = command.split(' ')[0].toUpperCase()
        const cmd = commands.get(cmdName)
        if (cmd) {
            await cmd.f(command, stdout, username, ipAddress, { commands })
        } else {
            stdout('Illegal Command\n')
        }
    } catch (ex) {
        stdout(ex.toString())
    }
    stdout('\n')
}
