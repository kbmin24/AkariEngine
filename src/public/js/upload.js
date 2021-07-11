document.getElementById('inputFile').onchange = () =>
{
    document.getElementById('filenameInputBox').value = document.getElementById('inputFile').value.replace(/^.*[\\\/]/igm, '')
    const [file] = document.getElementById('inputFile').files
    if (file)
    {
        document.getElementById('uploadImagePreview').src = URL.createObjectURL(file)
        document.getElementById('uploadButton').disabled = false;
    }
    else
    {
        document.getElementById('uploadButton').disabled = true;
    }
}