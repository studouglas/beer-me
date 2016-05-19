'use strict';
var LOW_QUANTITY_THRESHOLD = 5; // low stock if at most 5 beers remain
var HIGH_ALCOHOL_PERCENTAGE = 650; // anything at least 6.5% is considered high alcohol

var LCBO_API_KEY = 'MDoxMTljMTZhNi0wZDg3LTExZTYtOWMxYi0xZjczNjZmZmI3NDc6aGlpbW5qa0FvRHFIVG1pSEhvdFRhQTBWdlFya3JVek90Q1pN';
var storeId = 511;
var isFeelingTurnt = false;

// try each page once, in a random order until fresh beer found or no pages left
var pageOrder = [];
var currentPageIndex = 0;

// objects keys are hashed in JS, so have one property per tried beer for fast lookup
// e.g. { 'beer1: true','beer2': true ... }
var triedBeers = { }; 
var last10Beers = [ ]; // keep array of last 10 for fast updating of list

$(document).ready(function() {
    loadTriedBeers();
    reloadTriedBeers();
});

// finds a random beer that hasn't been tried yet
function beerMeClicked() {
    showLoadingSpinner();

    // load first page to get total num pages, then try random pages until new beer found
    $.ajax({
        url: 'https://lcboapi.com/stores/' + storeId + '/products?page=1',
        headers: { 'Authorization': 'Token ' + LCBO_API_KEY }
    }).then(function (jsonResponse) {
        // randomize order of pages to try
        pageOrder = new Array(jsonResponse.pager.total_pages);
        for (var i = 0; i < jsonResponse.pager.total_pages; i += 1) {
            pageOrder[i] = i+1; // pages ordered 1...totalPages
        }
        shuffleArray(pageOrder);
        
        tryNextRandomPage();
    });
}

function loadTriedBeers() {
    // load tried beers from local browser cache
    if (localStorage.getItem('triedBeers') !== null) {
        var triedBeersArr = localStorage.getItem('triedBeers').split('-');
        var beersAddedToLast10 = 0;
        for (var i = 0; i < triedBeersArr.length; i += 1) {
            var beerNameAndDate = JSON.parse(triedBeersArr[i]);
            triedBeers[beerNameAndDate.beerName] = beerNameAndDate.triedDate;
            if (i >= triedBeersArr.length - 10) {
                last10Beers[beersAddedToLast10] = JSON.parse(triedBeersArr[i]);
                beersAddedToLast10++;
            }
        }
    }
}

// fetches products from a random page, when done check for a new one
function tryNextRandomPage() {
    if (currentPageIndex === pageOrder.length) {
        alert('You\'ve tried all the beers! Try resetting your them using the button in the top right.');
    }

    $.ajax({
        url: 'https://lcboapi.com/stores/' + storeId + '/products?page=' + pageOrder[currentPageIndex],
        headers: { 'Authorization': 'Token ' + LCBO_API_KEY },
        success: checkResponseForFreshBeer
    });
    currentPageIndex += 1;
}

// takes page of products and check if any are beers that haven't been tried yet
function checkResponseForFreshBeer(jsonResponse) {
    if (jsonResponse.status !== 200) {
        alert('An error occured looking up beers. ' + jsonResponse.message);
        return;
    }
    if (jsonResponse.result === null) {
        alert('No beers found at store ' + storeId + '.');
        return;
    }
    
    // check each item on page, if beer that hasn't been tried update UI (we're done)
    shuffleArray(jsonResponse.result);
    for (var i = 0; i < jsonResponse.result.length; i += 1) {
        if (jsonResponse.result[i].primary_category === 'Beer'
                && jsonResponse.result[i].quantity > 0
                && (!isFeelingTurnt || jsonResponse.result[i].alcohol_content >= 650)
                && triedBeers[jsonResponse.result[i].name] !== true) {
            foundFreshBeer(jsonResponse.result[i]);
            return;
        }
    }
    
    tryNextRandomPage();
}

// update UI with our new beer, and some stats about it
function foundFreshBeer(productJson) {
    // store the beer in browser cache so we don't try it again
    var nameAndDateStr = JSON.stringify({'beerName': productJson.name, 'triedDate': dateToFormattedString(new Date())});
    if (localStorage.getItem('triedBeers') === null) {
        localStorage.setItem('triedBeers', nameAndDateStr);    
    } else {
        localStorage.setItem('triedBeers', localStorage.getItem('triedBeers') + '-' + nameAndDateStr);    
    }
    
    var redIfLowQuantity = productJson.quantity <= LOW_QUANTITY_THRESHOLD ? ' red-text' : '';
    var redIfHighAlcohol = productJson.alcohol_content >= HIGH_ALCOHOL_PERCENTAGE ? ' red-text' : '';
    
    // update UI with beer info and photo
    $('#beer-name')[0].innerHTML = productJson.name;
    $('#beer-caption')[0].innerHTML = '<span class="float-left' + redIfLowQuantity + '">' + productJson.quantity + ' in stock</span>&nbsp;';
    $('#beer-caption')[0].innerHTML += '<span class="float-right' + redIfHighAlcohol + '">' + productJson.alcohol_content / 100 + '% alcohol</span>';
    $('#beer-img')[0].innerHTML = '';
    if (productJson.image_url !== null) {
        $('#beer-img')[0].innerHTML = '<img src="' + productJson.image_url + '" class="full-width" alt="' + productJson.name + '">';
    }
    
    hideLoadingSpinner();
    reloadTriedBeers();
}

function reloadTriedBeers() {
    $('.tried-beers-container')[0].style.visibility = 'visible';
    loadTriedBeers();
    $('#tried-beers-list')[0].innerHTML = last10Beers.length > 0 ? '' : '<p>You haven\'t tried any beers!</p>';
    for (var i = last10Beers.length - 1; i >= 0; i -= 1) {
        $('#tried-beers-list')[0].innerHTML += '<p>' + (last10Beers.length - i) + '. ' + last10Beers[i].beerName + ' --- ' + last10Beers[i].triedDate + '</p>';
    }
}

function resetTriedBeers() {
    if (confirm('Are you sure you want to reset all beers you\'ve previously tried?')) {
        localStorage.removeItem('triedBeers');
        triedBeers = { };
    }
}

function turntCheckboxChanged(sender) {
    isFeelingTurnt = sender.checked;
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
    for (var i = array.length - 1; i > 0; i -= 1) {
        var j = Math.floor(Math.random() * (i + 1));
        var temp = array[i];
        array[i] = array[j];
        array[j] = temp;
    }
    return array;
}

// convert date to specified format
// http://stackoverflow.com/a/3067896/1176865
function dateToFormattedString(date) {
   var yyyy = date.getFullYear().toString();
   var mm = (date.getMonth() + 1).toString(); // getMonth() is zero-based
   var dd  = date.getDate().toString();
   return yyyy + '/' + (mm[1] ? mm : "0" + mm[0]) + '/' + (dd[1] ? dd: "0" + dd[0]); // padding
}
