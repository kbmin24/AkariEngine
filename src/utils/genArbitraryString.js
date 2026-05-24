/**
 * Generates a random alphanumeric string of a specified length.
 * @param {number} [length=16] - The length of the string to generate.
 * @returns {string} A random alphanumeric string.
 */
export default (length = 16) => {
    //https://stackoverflow.com/questions/1349404/generate-random-string-characters-in-javascript
    let res = ''
    let chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789'
    let charLen = chars.length
    for (let i = 0; i < length; i++)
    {
        res += chars.charAt(Math.floor(Math.random() * charLen))
    }
    return res
}