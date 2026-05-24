/* eslint-disable no-undef */
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
            console.error('An error occurred while initialising CKEditor5.')
            console.error(error)
        })
})