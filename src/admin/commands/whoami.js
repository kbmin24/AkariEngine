export default {
    name: 'WHOAMI',
    shortDesc: 'Shows your current session identity.',
    longDesc: 'Prints the username and IP address of the current session.',
    async f(command, stdout, username, ipAddress, options = {}) {
        stdout(`${username} at ${ipAddress}\n`)
    }
}