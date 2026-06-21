import sanitiseHtml from 'sanitize-html'

const sanitiseUsername = username => sanitiseHtml(String(username ?? ''), {
    allowedTags: [],
    allowedAttributes: {},
    disallowedTagsMode: 'escape'
})

const serializeThreadComment = async (comment, renderService) => {
    const content = comment.isHidden ? '' : comment.content
    const contentHTML = (await renderService.render(content, {}, false)).html

    return {
        id: comment.id,
        threadID: comment.threadID,
        type: comment.type,
        username: sanitiseUsername(comment.doneBy),
        content: contentHTML,
        date: comment.createdAt,
        isHidden: comment.isHidden
    }
}

const serializeThreadComments = (comments, renderService) =>
    Promise.all(comments.map(comment => serializeThreadComment(comment, renderService)))

export { serializeThreadComment, serializeThreadComments }
