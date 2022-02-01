$(() =>
{
    ClassicEditor.create(document.querySelector("#editAreaBox"),
    {
        language: 'ko',
        mediaEmbed:
        {
            previewsInData: true
        },
        simpleUpload:
        {
            uploadUrl: '/board/upload'
        }
    })
    .then(editor =>
        {
            window.editor = editor
        })
    .catch(error =>
        {
            console.error('CKEditor5을 불러오는 중 오류가 발생했습니다.')
            console.error(error)
        })
})