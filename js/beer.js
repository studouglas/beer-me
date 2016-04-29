'use strict';

var storeId = 511;
var lcboApiKey = '';
var totalPages = 0;
var pagesTried = [];

// objects keys are hashed in js, so have one property per tried beer for O(1)-ish lookup
// e.g. { 'beer1: true','beer2': true ... }
var triedBeers = {}; 

$(document).ready(function () {
   hideLoadingSpinner(); 
});

// finds a random beer that hasn't been tried yet
function beerMeClicked() {
    showLoadingSpinner();
    
    // get private api key from server
    loadApiKey();
    
    // load tried beers from local browser cache
    if (localStorage.getItem('triedBeers') !== null) {
        var triedBeersArr = localStorage.getItem('triedBeers').split(',');
        for (var i = 0; i < triedBeersArr.length; i += 1) {
            triedBeers[triedBeersArr[i]] = true;
        }
    }
    
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

// fetches products from a random page, when done check for a new one
function tryRandomPage() {
    var randomPage = Math.floor((Math.random() * totalPages) + 1);
    console.log('Trying page ' + randomPage + ' out of ' + totalPages);
    $.ajax({
        url: 'https://lcboapi.com/stores/' + storeId + '/products?page=' + randomPage,
        headers: { 'Authorization': 'Token ' + lcboApiKey },
        success: checkResponseForFreshBeer
    });
}

// takes page of products and check if any are beers that haven't been tried yet
function checkResponseForFreshBeer(jsonResponse) {
    if (jsonResponse.status !== 200) {
        console.log(jsonResponse.message);
        return;
    }
    if (jsonResponse.result === null) {
        console.log('No beers found at store ' + storeId);
        return;
    }
    
    // check each item on page, if beer that hasn't been tried update UI (we're done)
    shuffleArray(jsonResponse.result);
    for (var i = 0; i < jsonResponse.result.length; i += 1) {
        if (jsonResponse.result[i].primary_category === 'Beer'
                && !jsonResponse.result[i].discontinued
                && triedBeers[jsonResponse.result[i].name] !== true) {
            foundFreshBeer(jsonResponse.result[i]);
            return;
        }
    }
    
    tryRandomPage();
}

// update UI with our new beer, and some stats about it
function foundFreshBeer(productJson) {
    console.log(productJson);
    // store the beer in browser cache so we don't try it again
    if (localStorage.getItem('triedBeers') === null) {
        localStorage.setItem('triedBeers', productJson.name);    
    } else {
        localStorage.setItem('triedBeers', localStorage.getItem('triedBeers') + ',' + productJson.name);    
    }
    
    // update UI with beer info and photo
    $('#beer-name')[0].innerHTML = productJson.name;
    $('#beer-caption')[0].innerHTML = '$' + (productJson.price_in_cents / 100).toFixed(2) + ' / ' + productJson.package_unit_type;
    $('#beer-caption')[0].innerHTML += ', ' + productJson.alcohol_content / 100 + '% alcohol';
    $('#beer-img')[0].innerHTML = "";
    if (productJson.image_url !== null) {
        $('#beer-img')[0].innerHTML = '<img src="' + productJson.image_url + '" class="full-width" alt="' + productJson.name + '">';
    }
    
    hideLoadingSpinner();
}

function resetTriedBeers() {
    if (confirm("Are you sure you want to reset all beers you've previously tried?")) {
        localStorage.removeItem('triedBeers');
    }
}

function showLoadingSpinner() {
    $('#loading-spinner')[0].style.visibility = 'visible';
}
function hideLoadingSpinner() {
    $('#loading-spinner')[0].style.visibility = 'hidden';
}

// randomly shuffles array in place, O(n)
// http://stackoverflow.com/a/12646864
function shuffleArray(array) {
    for (var i = array.length - 1; i > 0; i--) {
        var j = Math.floor(Math.random() * (i + 1));
        var temp = array[i];
        array[i] = array[j];
        array[j] = temp;
    }
    return array;
}