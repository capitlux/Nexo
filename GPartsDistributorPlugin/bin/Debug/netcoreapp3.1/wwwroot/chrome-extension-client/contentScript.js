$(document).ready(function () {
    if (window.location.href.indexOf('https://web2.carparts-cat.com') != -1) {
        $('.wk_icon').each(function () {
            var code = $(this).closest('.main_artikel_panel_tr_artikel').find('.pnl_link_eartnr nobr').text();
            addShortcut(code, $(this).parent());
        });
    }
    else if (window.location.href.indexOf('https://www.partslink24.com') != -1) {
        $('.partinfoButton').each(function () {
            var code = $(this).closest('tr').find('.portnoFormatted').text();
            addShortcut(code, $(this).parent());
        });
    } else if (window.location.href.indexOf('http://drivecat.atelio-iam.com') != -1) {
        $('.refPieceAM, .refPieceOE').each(function () {
            var code = $(this).text();
            addShortcut(code, $(this).parent());
        });
    } else if (window.location.href.indexOf('https://www.partsnet.fr/instantorder/') != -1) {
        $('.HoofdSchermKader td.ButtonGeel').each(function () {
            var $container = $(this).find('table').length > 0 ? $(this).find('table .Geel') : $(this);
            var $buttonAddToQuotation = $('<img width="24" title="Effectuer une recherche sur cette référence" style="cursor:pointer;">');
            $buttonAddToQuotation.attr('src', chrome.runtime.getURL("happy.png"));
            $container.append($buttonAddToQuotation);
            $buttonAddToQuotation.click(function () {
                var code = $(this).closest('table [height="200"]').find('.InfoData1').first().text().cleanText();
                chrome.runtime.sendMessage({ id: CONST_SearchRequestFromShortcut, searchTerm: code });
            });

        });
    } else if (window.location.href.indexOf('http://ecat.exadis.fr/ecatvl') != -1) {

        /* $('body').on('DOMSubtreeModified', '.gridZone', function () {
             $('.xp-shortcut').remove();
             $('.gridZone .ArticleResultGrid tbody tr').has('.StyleCheckBox').each(function () {
                 var code = $(this).find('td').eq(4).text().cleanText();
                 addShortcut(code, $(this).find('td'));
             });
         });*/
    } else if (window.location.href.indexOf('https://web.tecalliance.net/') != -1) {

        var myEfficientFn = debounce(function () {
            $('.article-number-cell:not(:has(.xp-shortcut))').each(function () {
                var code = $(this).find('a').text().cleanText();
                addShortcut(code, $(this), true);
            });
        }, 250);
        $('body').on('DOMSubtreeModified', '.parts-grid', myEfficientFn);

    }
});

function addShortcut(code, $container, prepend) {
    var $buttonAddToQuotation = $('<img class="xp-shortcut" width="24" title="Effectuer une recherche sur ' + code + '" style="cursor:pointer;">');
    $buttonAddToQuotation.attr('src', chrome.runtime.getURL("happy.png"));

    if (prepend)
        $container.prepend($buttonAddToQuotation);
    else
        $container.append($buttonAddToQuotation);

    $buttonAddToQuotation.click(function (e) {
        e.stopImmediatePropagation();
        chrome.runtime.sendMessage({ id: CONST_SearchRequestFromShortcut, searchTerm: code });
    });
}