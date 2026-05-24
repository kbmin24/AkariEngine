export default {
    name: 'HELP',
    shortDesc: 'Lists all commands or shows help for a specific command.',
    longDesc: 'Usage: HELP [command]\nWithout arguments, lists all available commands. With a command name, shows detailed help for that command.',
    async f(command, stdout, username, ipAddress, options = {}) {
        const { commands } = options
        const cmdSplit = command.split(' ')

        if (cmdSplit[1]) {
            const target = commands.get(cmdSplit[1].toUpperCase())
            if (target) {
                stdout(target.longDesc + '\n')
            } else {
                stdout(`Unknown command: ${cmdSplit[1].toUpperCase()}\n`)
            }
        } else {
            for (const cmd of commands.values()) {
                stdout(`${cmd.name.padEnd(20)}${cmd.shortDesc}\n`)
            }
        }
    }
}