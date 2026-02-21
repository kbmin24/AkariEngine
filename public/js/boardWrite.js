$(() =>
{
    ClassicEditor.create(document.querySelector("#editAreaBox"),
    {
        language: 'ko',
        mediaEmbed:
        {
            previewsInData: true,
            removeProviders:
            [
                'instagram',
                'twitter',
                'googleMaps',
                'flickr',
                'facebook',
                'dailymotion',
                'spotify',
                'vimeo'
            ]
        },
        simpleUpload:
        {
            uploadUrl: '/board/upload',
            headers:
            {
                boardid: $('#bBoard').attr('value')
            }
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