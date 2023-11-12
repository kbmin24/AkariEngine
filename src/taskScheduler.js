const schedule = require('node-schedule')
const Dequeue = require('dequeue')

async function updateOrphaned()
{
    //BFS is used.
    //We find the set of entire pages
    //and pages that can be fetched from FrontPage.
    //we then take their differences.

    //fetch data
    let links = await global.db.links.findAll()

    //compute the universal set, initialise graph
    let U = new Set()
    let graph = {}
    let pgquery = await global.db.pages.findAll({attributes: ['title']})
    for (let i = 0; i < pgquery.length; i++)
    {
        if (pgquery[i].title.toLowerCase().startsWith('user') ||
        pgquery[i].title.toLowerCase().startsWith('file'))
            continue
        U.add(pgquery[i].title)
        graph[pgquery[i].title] = []
    }

    //construct graph
    for (let i = 0; i < links.length; i++)
    {
        if (links[i].source.toLowerCase().startsWith('user') ||
        links[i].source.toLowerCase().startsWith('file') ||
        links[i].dest.toLowerCase().startsWith('user') ||
        links[i].dest.toLowerCase().startsWith('file'))
            continue
        graph[links[i].source].push(links[i].dest)
    }

    let q = new Dequeue()
    let visited = new Set()
    
    q.push('FrontPage')
    visited.add('FrontPage')
    while (q.length)
    {
        let pg = q.shift()

        for (let next of graph[pg])
        {
            if (!visited.has(next))
            {
                q.push(next)
                visited.add(next)
            }
        }
    }

    //https://stackoverflow.com/questions/1723168/what-is-the-fastest-or-most-elegant-way-to-compute-a-set-difference-using-javasc
    let orphaned = new Set([...U].filter(x => !visited.has(x)))
    global.orphaned = orphaned
}

module.exports = async () =>
{
    updateOrphaned()
    const orphaned = schedule.scheduleJob('0 0 * * *', () =>
    {
        console.log('Updating orphaned page list...')
        updateOrphaned()
    })
}