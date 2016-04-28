'use strict';

var HTTP_STATUS_OK = 200;
var storeId = 511;
var lcboApiKey = '';
var totalPages = 0;
var pagesTried = [];

function beerMeClicked() {
    // get private api key from server
    loadApiKey();

    // load first page to get total num pages, then try random pages until new beer found
    $.ajax({
        url: 'https://lcboapi.com/stores/' + storeId + '/products?page=1',
        headers: { 'Authorization': 'Token ' + lcboApiKey }
    }).then(function (jsonResponse) {
        totalPages = jsonResponse.pager.total_pages;
        tryRandomPage();
    });
}

function loadApiKey() {
    $.ajax({
        type: 'GET',
        url: 'lcbo_api_key.php'
    }).then(function (data) {
        lcboApiKey = data;
    });
}

function tryRandomPage() {
    var randomPage = Math.floor((Math.random() * totalPages) + 1);
    console.log('Trying page ' + randomPage + ' out of ' + totalPages);
    $.ajax({
        url: 'https://lcboapi.com/stores/' + storeId + '/products?page=' + randomPage,
        headers: { 'Authorization': 'Token ' + lcboApiKey },
        success: checkResponseForFreshBeer
    });
}

function checkResponseForFreshBeer(jsonResponse) {
    var i = 0;
    if (jsonResponse.status !== HTTP_STATUS_OK) {
        console.log(jsonResponse.message);
        return;
    }
    if (jsonResponse.result === null) {
        console.log('No beers found at store ' + storeId);
        return;
    }
    
    for (i = 0; i < jsonResponse.result.length; i += 1) {
        if (jsonResponse.result[i].primary_category === 'Beer') {
            foundFreshBeer(jsonResponse.result[i]);
            return;
        }
    }
    
    tryRandomPage();
}

function foundFreshBeer(productJson) {
    console.log(productJson.name);
    $('#beer-name')[0].innerHTML = productJson.name;
    $('#beer-caption')[0].innerHTML = '$' + productJson.price_in_cents / 100 + ' / ' + productJson.package_unit_type;
    $('#beer-caption')[0].innerHTML += ', ' + productJson.alcohol_content / 100 + '% alcohol';
    $('#beer-img')[0].src = productJson.image_url;
}