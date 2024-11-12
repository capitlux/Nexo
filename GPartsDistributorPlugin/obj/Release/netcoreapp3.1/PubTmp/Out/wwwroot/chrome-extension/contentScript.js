
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