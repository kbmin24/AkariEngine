let stdout = (socket, data) =>
{
    socket.emit('output', data)
}
module.exports = async (io, socket, command, options) =>
{
    try
    {
        //Refuse to do anything if permission is insufficient
        let username = socket.handshake.session.username
        let ip = socket.handshake.headers['x-real-ip'] || socket.handshake.address
        if (!(await options.perm.findOne({where: {username: username, perm: 'developer'}}))) return

        //start a new line
        stdout(socket, `>>> ${command}\n`)
        let cmdSplit = command.split(' ')
        switch (cmdSplit[0])
        {
            case 'cleancategories':
            {
                let cat = await options.category.findAll()
                cat.forEach(async (val, i , err) =>
                {
                    if (await options.pages.findOne({where: {title: val.page}}))
                    {
                        //do nothing
                    }
                    else
                    {
                        options.category.destroy({where: {page: val.page}})
                    }
                })
                break
            }
            case 'filemigration':
            {
                //go thru the list of files
                let files = await options.file.findAll()
                files.forEach(async (val, i, arr) =>
                {
                    let filepgname = 'File:' + val.filename
                    stdout(socket, `${val.filename}...`)
                    
                    await options.pages.create({
                        title: filepgname,
                        content: val.explanation,
                        currentRev: 1
                    })
                    
                   
                    await options.history.create(
                        {
                            page: filepgname,
                            rev: 1,
                            content: val.explanation,
                            bytechange: val.explanation.length,
                            editedby: val.uploader,
                            comment: `Uploaded ${val.filename}`,
                            type: 'edit'
                        })
                    stdout(socket, `OK!\n`)
                })
                stdout(socket, '\n')
                break
            }
            case 'permissions':
            {
                let searchOptions = {order: [['username', 'DESC']]}
                if (cmdSplit[1]) searchOptions.where = {'username': cmdSplit[1]}
                let permissions = await options.perm.findAll(searchOptions)
                let usernameNow = ''
                permissions.forEach(element =>
                {
                    if (element.username !== usernameNow)
                    {
                        if (usernameNow !== '') stdout(socket, '\n')
                        stdout(socket, element.username + ': ')
                    }
                    usernameNow = element.username
                    stdout(socket, element.perm + ' ')
                })
                stdout(socket, '\n')
                break
            }
            case 'help':
            {
                let help = `cleancategories\nfilemigration\nhelp\npermissions (username)\ngenbacklinks\ngenpassword (pw) (salt)\nwhoami\n`
                stdout(socket, help)
                break
            }
            case 'genbacklinks':
            {
                //May be slow!

                //get list of pages

                await global.db.links.destroy({
                    where: {},
                    truncate: true
                })

                let pages = await global.db.pages.findAll()
                let res = []
                stdout(socket, `${pages.length} pages found.\n`)

                
                for (let i = 0; i < pages.length; i++)
                {
                    let found = new Set()

                    //wout separate label
                    //use actual logic of renderer
                    {
                        let r = /\[\[([^|\r\n]*?)\]\]/igm
                        pages[i].content = pages[i].content.replace(r, (_match, p1, _offset, _string, _groups) =>
                        {
                            if (p1.toLowerCase().startsWith('category') ||
                            p1.toLowerCase().startsWith('분류') ||
                            p1.toLowerCase().startsWith('http://') ||
                            p1.toLowerCase().startsWith('https://'))
                                return ''
                            if (found.has(p1)) return ''
    
                            found.add(p1)
    
                            res.push({source: pages[i].title, dest: p1})
    
                            return ''
                        })
                    }

                    //w separate label
                    {
                        let r = /\[\[(.*?)\|(.*?)\]\]/igm
                        pages[i].content = pages[i].content.replace(r, (_match, p1, _offset, _string, _groups) =>
                        {
                            if (p1.toLowerCase().startsWith('category') ||
                            p1.toLowerCase().startsWith('분류') ||
                            p1.toLowerCase().startsWith('http://') ||
                            p1.toLowerCase().startsWith('https://'))
                                return ''
                            if (found.has(p1)) return ''

                            found.add(p1)

                            res.push({source: pages[i].title, dest: p1})

                            return ''
                        })
                    }
                }

                stdout(socket, `Committing changes (${res.length} entries)...\n`)
                await global.db.links.bulkCreate(res)
                stdout(socket, "Done.")
                break
            }
            case 'genpassword':
            {
                const crypto = require('crypto')
                crypto.pbkdf2(cmdSplit[1], cmdSplit[2], 10000, 64, 'sha512', (err, hashedPW) =>
                {
                    if (err) throw new err
                    stdout(socket, hashedPW.toString('base64') + '\n')
                })
                break
            }
            case 'whoami':
            {
                stdout(socket, `${username} at ${ip}\n`)
                break
            }
            default:
            {
                stdout(socket, 'Illegal Command\n')
                break
            }
        }
    }
    catch (ex)
    {
        stdout(socket, ex.toString())
    }
    stdout(socket, '\n')
}