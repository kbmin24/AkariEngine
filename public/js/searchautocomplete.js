$(function() {
    $('#searchinput').autocomplete({
        source: (req, res) =>
        {
            $.ajax({
                url: '/ajax/autocomplete',
                dataType: 'json',
                data: {q: req.term},
                success: (data) =>
                {
                    res(
                        $.map(data, (item) =>
                        {
                            return {
                                label: item.title,
                                value: item.title
                            }
                        })
                    )
                }
            })
        },
        minLength: 1
    })
})