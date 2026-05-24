/* eslint-disable no-unused-vars */
function previewButtonClick()
{
    document.getElementById('previewContent').value = document.getElementById('editAreaBox').value
    document.getElementById('previewForm').submit()
}