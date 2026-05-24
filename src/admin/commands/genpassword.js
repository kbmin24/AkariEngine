import crypto from 'node:crypto'

export default {
    name: 'GENPASSWORD',
    shortDesc: 'Generates a PBKDF2-SHA512 hashed password.',
    longDesc: 'Usage: GENPASSWORD <password> <salt>\nGenerates a PBKDF2-SHA512 hash of the given password with the given salt (10000 iterations, 64 bytes).',
    async f(command, stdout, username, ipAddress, options = {}) {
        const cmdSplit = command.split(' ')
        if (!cmdSplit[1] || !cmdSplit[2]) {
            stdout('Usage: GENPASSWORD <password> <salt>\n')
            return
        }
        await new Promise((resolve, reject) => {
            crypto.pbkdf2(cmdSplit[1], cmdSplit[2], 10000, 64, 'sha512', (err, hashedPW) => {
                if (err) { reject(err); return }
                stdout(hashedPW.toString('base64') + '\n')
                resolve()
            })
        })
    }
}