function editMacro (pre, main, suff)
{
    let myField = document.getElementById('editAreaBox')
    if (myField.selectionStart || myField.selectionStart == '0')
    {
        var startPos = myField.selectionStart;
        var endPos = myField.selectionEnd;
        myValue = pre
        + (endPos == startPos ? main : myField.value.substring(startPos, endPos))
        + suff;
        myField.value = myField.value.substring(0, startPos)
            + myValue
            + myField.value.substring(endPos, myField.value.length);
        
        myField.selectionStart = startPos;
        myField.selectionEnd = startPos + myValue.length;
    }
}