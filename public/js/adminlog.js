$(() =>
{
    const params = (new URL(document.location)).searchParams
    $("#doneby").val(params.get("doneBy"))
    $("#job").val(params.get("job"))
})