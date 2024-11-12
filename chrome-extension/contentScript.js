


/*
// Listening to messages in Context Script
chrome.runtime.onMessage.addListener(function (message, sender, sendResponse) {

    if (message.id == CONST_ContextMenuProductSearch) {

        //If event is dispatched from current location, ignore it !
        var currentUrlStart = window.location.protocol + "//" + window.location.host;
        if (message.contextMenuUrl.indexOf(currentUrlStart) != -1)
            return;



        if (window.location.href.indexOf('https://web2.carparts-cat.com') != -1) {
            $('#tp_articlesearch_txt_articleSearch').val(message.term);
            $('#tp_articlesearch_articleSearch_imgBtn').click();
        } else if (window.location.href.indexOf('http://ecat.exadis.fr') != -1) {
            $('.searchZone.PiecesZone input').val(message.term);
            $('.searchZone.PiecesZone .SearchButton').click();
        } else if (window.location.href.indexOf('http://safaplus.inoshop.net') != -1) {
            $('#code_article_input').val(message.term);
            $('#envoie_formulaire').click();
        } else if (window.location.href.indexOf('http://www.carest.eu') != -1) {
            $('.input-product-search').val(message.term);
            $('.button-product-search').click();
        }
    }
});*/

$(document).ready(function () {
    if (window.location.href.indexOf('https://web2.carparts-cat.com') != -1) {
        $('.wk_icon').each(function () {
            var $buttonAddToQuotation = $('<img width="24" title="Ajouter la sélection à mon devis GParts">');
            $buttonAddToQuotation.attr('src', chrome.runtime.getURL("happy.png"));
            $(this).parent().append($buttonAddToQuotation);
            $buttonAddToQuotation.click(function () {

                var code = $(this).closest('.main_artikel_panel_tr_artikel').find('.pnl_link_eartnr nobr').text();
                var make = $(this).closest('.main_artikel_panel_tr_artikel').prev('.main_artikel_panel_tr_einspeiser').text();
                var vendor = "HESS";
                var pricePurchase = $(this).closest('.main_artikel_panel_tr_artikel').find('.tbl_al_erp_price_spalte_prVal').eq(1).text();

                toastr.options = {
                    "closeButton": false,
                    "debug": false,
                    "newestOnTop": false,
                    "progressBar": true,
                    "positionClass": "toast-bottom-center",
                    "preventDuplicates": false,
                    "onclick": null,
                    "showDuration": "300",
                    "hideDuration": "1000",
                    "timeOut": "5000",
                    "extendedTimeOut": "1000",
                    "showEasing": "swing",
                    "hideEasing": "linear",
                    "showMethod": "fadeIn",
                    "hideMethod": "fadeOut"
                };
                toastr["success"]('FOURNISSEUR: ' + vendor + '<br/>' +
                    'MARQUE: ' + make + '<br/>' +
                    'REFERENCE: ' + code + '<br/>' +
                    'PRIX D\'ACHAT: ' + pricePurchase + '<br/><br/>' +
                    'Le produit a bien été ajouté à votre devis GParts.');
            });
        });
    }
});