import sanitiseHtml from 'sanitize-html'

const sanitiseUsername = username => sanitiseHtml(String(username ?? ''), {
    allowedTags: [],
    allowedAttributes: {},
    disallowedTagsMode: 'escape'
})

const serializeThreadComment = async (comment, renderService, renderFunction) => {
    const content = comment.isHidden ? '' : comment.content
    const contentHTML = (await renderService.render(content, renderFunction, {}, false)).html

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

const serializeThreadComments = (comments, renderService, renderFunction) =>
    Promise.all(comments.map(comment => serializeThreadComment(comment, renderService, renderFunction)))

export { serializeThreadComment, serializeThreadComments }
