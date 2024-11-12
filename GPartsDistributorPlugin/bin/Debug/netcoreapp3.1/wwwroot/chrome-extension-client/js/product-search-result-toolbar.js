var settings = null;
var taxCoef = 1.2;
var pricingMode = 'coeff';
var pricingCoef = 2;

$(document).ready(function () {
    $('.filterAvailable input:radio').click(function () {
        if (hasScrollDuringDataLoad) {
            hasScrollDuringDataLoad = false;
            $('.filterAvailable label.active').tooltip('hide');
            updateGridData();
        }
        else
            filterDataGrid();
    });
    $('input.price-coeff').change(function () {
        var value = parseFloat($('input.price-coeff').val());
        if (pricingMode == 'coeff')
            pricingCoef = value;
        else
            pricingCoef = (1 / (1 - value / 100)).toFixed(2);

        $("#grid").data("kendoGrid").refresh();
    });
    $('.make-asso, .make-asso-list, .make-privileged-list').click(function () {
        $('.input-modal-filter-make').val(null);
        if ($(this).filter('.make-asso-list, .make-privileged-list').length > 0)
            $('.input-modal-filter-make').removeClass('d-none');
        else
            $('.input-modal-filter-make').addClass('d-none');

        if ($(this).filter('.make-asso, .make-asso-list').length > 0) {
            $('#modalMakeAsso .modal-body').attr('data-mode', 'asso');
            $('#modalMakeAsso .modal-title').text('Associations des noms de marques');
            updateAssoMakeList($(this).hasClass('make-asso-list'));
        }
        else {
            $('#modalMakeAsso .modal-body').attr('data-mode', 'privileged');
            $('#modalMakeAsso .modal-title').text('Liste des marques privilégiées');
            updateMakePrivilegedList();
        }
    });

    $('.input-modal-filter-make').keyup(function () {
        if ($('#modalMakeAsso .modal-body').attr('data-mode') == 'asso')
            updateAssoMakeList(true);
        else
            updateMakePrivilegedList();
    });

    $('.make-asso-validate').click(function () {
        if ($('#modalMakeAsso .modal-body').attr('data-mode') == 'asso') {
            var makeAssoList = getMakeAssoList();
            if (!makeAssoList)
                makeAssoList = [];
            if ($('.input-modal-filter-make').hasClass('d-none')) {
                var foundAsso = null;
                for (var i = 0; i < makeAssoList.length && !foundAsso; i++) {
                    var curAsso = makeAssoList[i];

                    if (curAsso.items.filter(value => selectedMakeList.includes(value)).length > 0) {
                        for (var k = 0; k < selectedMakeList.length; k++) {
                            if (!curAsso.items.includes(selectedMakeList[k]))
                                curAsso.items.push(selectedMakeList[k]);
                        }
                        foundAsso = curAsso;
                    }
                }
                var selectedTitle = $('#modalMakeAsso .modal-body .badge-primary').text();
                if (!foundAsso) {
                    makeAssoList.push({ title: selectedTitle, items: selectedMakeList });
                }
                else
                    foundAsso.title = selectedTitle;
            }
            else {
                var updatedMakeAssoList = [];
                $('#modalMakeAsso .modal-body div').each(function () {

                    var allItems = $(this).find('.badge').map(function () {
                        return $(this).text().cleanText();
                    }).get();
                    var foundIndex = null;
                    for (var i = 0; i < makeAssoList.length && !foundAsso; i++) {
                        var curAsso = makeAssoList[i];
                        if (curAsso.items.filter(value => allItems.includes(value)).length > 0) {
                            foundIndex = i;
                            break;
                        }
                    }
                    if (foundIndex != null)
                        makeAssoList.splice(foundIndex, 1);

                    var items = $(this).find('.badge').not('.badge-danger').map(function () {
                        return $(this).text().cleanText();
                    }).get();
                    if (items.length < 2)
                        return;
                    updatedMakeAssoList.push({ title: $(this).find('.badge-primary').length == 1 ? $(this).find('.badge-primary').text().cleanText() : items[0], items });
                });
                makeAssoList = makeAssoList.concat(updatedMakeAssoList);
            }
            setMakeAssoList(makeAssoList);
            $('#modalMakeAsso').modal('hide');
            selectedMakeList = [];
        }
        else {
            var makePrivilegedList = getMakePrivilegedList();
            if (!makePrivilegedList)
                makePrivilegedList = [];
            $('#modalMakeAsso .modal-body .badge-danger').each(function () {
                var make = $(this).text().cleanText();
                if (makePrivilegedList.includes(make))
                    makePrivilegedList.splice(makePrivilegedList.indexOf(make), 1);
            });
            setMakePrivilegedList(makePrivilegedList);
            bookmarkedMakeList = makePrivilegedList;
            $('#modalMakeAsso').modal('hide');
        }
        updateGridData();
    });

    $('.make-bookmark').click(function () {

        if (!bookmarkedMakeList)
            bookmarkedMakeList = [];
        for (var i = 0; i < selectedMakeList.length; i++) {
            if (!bookmarkedMakeList.includes(selectedMakeList[i]))
                bookmarkedMakeList.push(selectedMakeList[i]);
        }
        setMakePrivilegedList(bookmarkedMakeList);
        selectedMakeList = [];
        updateGridData();
    });

    $('.btn-group.tax a').click(function () {
        $('.btn-group.tax button').text($(this).text());
        taxCoef = parseFloat($(this).attr('data-coeff'));
        $("#grid").data("kendoGrid").refresh();
    });

    $('.btn-group.pricing-mode a').click(function () {
        $('.btn-group.pricing-mode button').text($(this).text());
        pricingMode= $(this).attr('data-mode');
        if (pricingMode == 'coeff') {
            $('input.price-coeff').val(pricingCoef);
            $('input.price-coeff').attr('min', 1);
            $('input.price-coeff').attr('max', 10);
            $('input.price-coeff').attr('step', 0.1);
        }
        else {
            pricingCoef = parseFloat($('input.price-coeff').val());
            var curMargin = (1 - 1 / pricingCoef) * 100;
            $('input.price-coeff').val(curMargin);
            $('input.price-coeff').attr('min', 0);
            $('input.price-coeff').attr('max', 99);
            $('input.price-coeff').attr('step', 1);
        }
        $("#grid").data("kendoGrid").refresh();
    });
});

function updateMakePrivilegedList() {

    var makePrivileged = getMakePrivilegedList();
    if (!makePrivileged)
        makePrivileged = [];
    $('#modalMakeAsso .modal-body').children().not('input').remove();
    var filterMake = $('.input-modal-filter-make').val().toUpperCase();
    var result = '';

    if (filterMake && filterMake.length > 0)
        makePrivileged = makePrivileged.filter(make => make.toUpperCase().includes(filterMake));

    for (var i = 0; i < makePrivileged.length; i++)
        result += ' <span style="cursor:pointer" class="badge badge-pill badge-warning">' + makePrivileged[i] + ' <span class="k-icon k-i-close text-alert"></span></span>';

    $('#modalMakeAsso .modal-body').append($(result));
    $('#modalMakeAsso .modal-body .badge .k-i-close').off().click(function (e) {
        if ($(this).closest('.badge').hasClass('badge-danger'))
            $(this).closest('.badge').removeClass('badge-primary badge-danger badge-warning').addClass('badge-warning');
        else
            $(this).closest('.badge').removeClass('badge-primary badge-danger badge-warning').addClass('badge-danger');
        e.stopPropagation();
    });
    $('#modalMakeAsso').modal();
}

function updateAssoMakeList(editList) {

    var makeAssoList = getMakeAssoList();
    if (!makeAssoList)
        makeAssoList = [];
    $('#modalMakeAsso .modal-body').children().not('input').remove();
    var filterMake = $('.input-modal-filter-make').val().toUpperCase();
    var result = '';
    if (editList) {
        for (var k = 0; k < makeAssoList.length; k++) {

            if (filterMake && filterMake.length > 0 && makeAssoList[k].items.filter(make => make.toUpperCase().includes(filterMake)).length <= 0)
                continue;

            if (k != 0)
                result += '<hr/>';

            var curAsso = makeAssoList[k].items;
            for (var i = 0; i < curAsso.length; i++) {
                if (i != 0)
                    result += ' <span class="k-icon k-i-link-horizontal"></span>';
                else
                    result += '<div>';
                result += ' <span style="cursor:pointer" class="badge badge-pill badge-' + (makeAssoList[k].title == curAsso[i] ? 'primary' : 'warning') + '">' + curAsso[i] + ' <span class="k-icon k-i-close text-alert"></span></span>';
            }
            result += '</div>';
        }
    } else {
        var existingAsso = null;
        var makeList = null;
        for (var k = 0; k < makeAssoList.length; k++) {
            var curAsso = makeAssoList[k];
            if (curAsso.items.filter(value => selectedMakeList.includes(value)).length > 0) {
                existingAsso = curAsso;
                makeList = curAsso.items;
                selectedMakeList.forEach(make => {
                    if (!makeList.includes(make))
                        makeList.push(make);
                });
                break;
            }
        }
        if (!existingAsso)
            makeList = selectedMakeList;
        makeList.forEach(make => {
            if (result != '')
                result += ' <span class="k-icon k-i-link-horizontal"></span>';
            result += ' <span style="cursor:pointer" class="badge badge-pill badge-' + ((existingAsso && existingAsso.title == make) || (!existingAsso && result == '') ? 'primary' : 'warning') + '">' + make + '</span>';
        });
    }

    $('#modalMakeAsso .modal-body').append($(result));
    $('#modalMakeAsso .modal-body .badge .k-i-close').off().click(function (e) {
        if ($(this).closest('.badge').hasClass('badge-danger'))
            $(this).closest('.badge').removeClass('badge-primary badge-danger badge-warning').addClass('badge-warning');
        else
            $(this).closest('.badge').removeClass('badge-primary badge-danger badge-warning').addClass('badge-danger');
        e.stopPropagation();
    });
    $('#modalMakeAsso .modal-body .badge').off().click(function () {
        $(this).closest('div').find('.badge').removeClass('badge-primary badge-warning').not($(this)).addClass('badge-warning');
        $(this).addClass('badge-primary');
    });
    $('#modalMakeAsso').modal();
}

function setSettings(data) {
    //localStorage.setItem('Settings', JSON.stringify(data));
    settings = data;
}
function setMakePrivilegedList(data) {
    var settings = getSettings();
    settings.makePrivilegedList = data;
    setSettings(settings);
    syncSettings(true);
}
function setMakeAssoList(data) {
    var settings = getSettings();
    settings.makeAssoList = data;
    setSettings(settings);
    syncSettings(true);
}
function getSettings() {
    //var data = JSON.parse(localStorage.getItem('Settings'));
    return settings;
}
function getMakePrivilegedList() {
    var data = getSettings();
    return data.makePrivilegedList;
}
function getMakeAssoList() {
    var data = getSettings();
    return data.makeAssoList;
}
function getMakeAsso(make) {
    var result = null;
    var makeAssoList = getMakeAssoList();
    if (makeAssoList) {
        for (var i = 0; i < makeAssoList.length; i++) {
            if (makeAssoList[i].items.includes(make)) {
                result = makeAssoList[i];
                break;
            }
        }
    }
    return result;
}

function getWebAppSupplierList() {
    var result = JSON.parse(localStorage.getItem('WebAppSupplierList'));
    if (!result)
        result = [];
    return result;
}

function syncSettings(isModifying) {
    var localSettings = getSettings();
    //Post results
    $.ajax({
        type: "POST",
        contentType: "application/json",
        url: CONST_ServerBaseUrl + "/CatalogService/SyncSettings",
        dataType: 'json',
        data: JSON.stringify(localSettings),
        success: function (result) {
            if (isModifying && localSettings && result.hasVersionChanged)
                alert('Le paramétrage a été modifié par un autre utilisateur, merci de recommencer.')
            setSettings(result.settings);
        }
    });
}