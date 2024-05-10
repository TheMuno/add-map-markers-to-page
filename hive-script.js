import { initializeApp } from "https://www.gstatic.com/firebasejs/10.1.0/firebase-app.js";
import { getFirestore, doc, setDoc, getDoc, 
    getDocs, updateDoc, deleteField, collection,
    arrayUnion, arrayRemove, serverTimestamp } from "https://www.gstatic.com/firebasejs/10.1.0/firebase-firestore.js";

// Your web app's Firebase configuration
const firebaseConfig = {
    apiKey: "AIzaSyBQPqbtlfHPLpB-JYbyxDZiugu4NqwpSeM",
    authDomain: "askkhonsu-map.firebaseapp.com",
    projectId: "askkhonsu-map",
    storageBucket: "askkhonsu-map.appspot.com",
    messagingSenderId: "266031876218",
    appId: "1:266031876218:web:ec93411f1c13d9731e93c3",
    measurementId: "G-Z7F4NJ4PHW"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Cloud Firestore and get a reference to the service
const db = getFirestore(app); 

if (!localStorage.getItem('user-email'))
localStorage.setItem('user-email', 'one@mail.com');  




const $map = document.querySelector('#map'),
    $userSearch = document.querySelector('.user-search'),
    $addToHiveBtn = document.querySelector('.add-to-hive'),
    $hiveWrapper = document.querySelector('.toggle-hive-wrapper'), 
    // $toggleHive = $hiveWrapper.querySelector('.toggle-hive'),
    // $toggleHiveFilters = $hiveWrapper.querySelector('.toggle-hive-filters'),
    $hiveFieldsets = document.querySelector('.hive-fieldsets'),
    $hiveFilterCheckboxes = $hiveWrapper.querySelectorAll('.hive-filter input'),
    toggleHiveInitialText = $hiveWrapper.querySelector('label').textContent,
    $hiveList = document.querySelector('.khonsu-data.hive .hive-list'),
    $hiveListAttractions = document.querySelector('.hive-list.attractions'),
    $hiveListRestaurants = document.querySelector('.hive-list.restaurants'),
    // $dayActivities = document.querySelector('.day-events');
    $dataTypeSelect = document.querySelector('.data-type-select'),
    $dataTypeSections = document.querySelectorAll('[data-type]'),
    $retailSections = document.querySelectorAll('[data-type="retail"]'),
    $attractionsSections = document.querySelectorAll('[data-type="attractions"]'),
    $restaurantsSections = document.querySelectorAll('[data-type="restaurants"]'),
    $addFilters = document.querySelector('.add-filters'),
    $saveEntryBtn = document.querySelector('.save-entry-btn');
    // $addFilterBtn = document.querySelector('.add-filter-btn');

const mapZoom = 13,
    initialCoords  = { lat: 40.7580, lng: -73.9855 },
    mapIcon = 'https://uploads-ssl.webflow.com/61268cc8812ac5956bad13e4/64ba87cd2730a9c6cf7c0d5a_pin%20(3).png', 
    orangeMapIcon = 'Imgs/pin_orange.png',
    cameraMapIcon = 'Imgs/camera-pin.png',
    bagMapIcon = 'Imgs/bag.png',
    restaurantMapIcon = 'Imgs/restaurant.png';

let map; // console.log('Y')

// setup map 
const icon = {
    url: mapIcon, //place.icon,
    size: new google.maps.Size(71, 71),
    origin: new google.maps.Point(0, 0),
    anchor: new google.maps.Point(17, 34),
    scaledSize: new google.maps.Size(25, 25),
};

const markerPopup = new google.maps.InfoWindow();  

!function initMap() {
    
    map = new google.maps.Map($map, { 
        zoom: mapZoom,
        center: initialCoords,
    });

    const searchBox = new google.maps.places.SearchBox($userSearch);
    
    // Bias the SearchBox results towards current map's viewport 
    map.addListener('bounds_changed', () => {
        searchBox.setBounds(map.getBounds()); 
    });

    searchBox.addListener('places_changed', (e) => { 
        const places = searchBox.getPlaces();
    
        if (places.length == 0) return;

        places.forEach((place) => {
            if (!place.geometry || !place.geometry.location) {
                alert('Sorry, try again\nNo cordinates found'); 
                return;
            }            

            const type = $dataTypeSelect.value.toLowerCase().trim();
            if (type.includes('retail')) {
                icon.url = bagMapIcon;
            }
            else if (type.includes('attractions')) {
                icon.url = cameraMapIcon;
            }
            else if (type.includes('restaurants')) {
                icon.url = restaurantMapIcon;
            }

            // const { marker, contentString } = createMarker(place, icon); 
            const { marker, rating, reviewsContent, operatingHrs, phoneNumber, address, contentString } = createMarker(place, icon); 

            map.panTo(marker.position);  
            markerPopup.close();
            markerPopup.setContent(contentString);
            markerPopup.open(marker.getMap(), marker); 
            
            const dayEventName = $userSearch.value;
            const title = dayEventName.split(',')[0];
            const lat = place.geometry.location.lat();
            const lng = place.geometry.location.lng();

            $saveEntryBtn.hiveObj = { 
                dayEventName, 
                title,
                lat,
                lng,
                rating, 
                reviewsContent, 
                operatingHrs, 
                phoneNumber, 
                address 
            };
        });

        // console.log('User search value:', $userSearch.value)
        // $userSearch.value = '';  
    });
}();

retrieveHiveFromDB(localStorage.getItem('user-email')); 

async function retrieveHiveFromDB(userMail) {    
    const userData = doc(db, 'travelData', `user-${userMail}`);
    const docSnap = await getDoc(userData);

    if (!docSnap.exists()) {
        // docSnap.data() will be undefined in this case
        console.log('No user with such email!');
        $noUser.textContent = 'No user with such email, sorry!';
        setTimeout(()=> $noUser.textContent = '', 5000);
        return; 
    } 

    const data = await docSnap.data(); 
    const { hive, hive_att, hive_rest } = data;

    console.log('The Hive:', hive)

    hive?.forEach(hiveItem => addToHive(hiveItem, $hiveList));

    hive_att?.forEach(hiveItem => {
        addToHive(hiveItem, $hiveListAttractions);
        $hiveListAttractions.markers.forEach(marker => marker.setMap(null)); 
    });

    hive_rest?.forEach(hiveItem => {
        addToHive(hiveItem, $hiveListRestaurants);
        $hiveListRestaurants.markers.forEach(marker => marker.setMap(null)); 
    });

    const retailLocationsNum = hive?.length;
    $hiveList.closest('.hive').querySelector('.item-no').textContent = `${retailLocationsNum} locations`;

    const attractionsLocationsNum = hive_att?.length;
    $hiveListAttractions.closest('.hive-attr').querySelector('.item-no').textContent = `${attractionsLocationsNum} locations`;

    const restaurantsLocationsNum = hive_rest?.length;
    $hiveListRestaurants.closest('.hive-rest').querySelector('.item-no').textContent = `${restaurantsLocationsNum} locations`;
}

function addToHive(hiveItem, hiveList) {
    const { dayEventName, title, lat, lng, rating, reviews, operatingHours, phoneNumber, address, filter } = hiveItem; 
    const locationInfo = {
        name: title,
        dayEventName,
        latLng: {lat, lng},
        rating,
        reviews,
        operatingHours,
        phoneNumber,
        address,
        filter,
    };

    const $hiveItem = document.createElement('div');
    $hiveItem.className = 'hive-item';
    $hiveItem.textContent = dayEventName;
    $hiveItem.locationInfo = locationInfo; 
    hiveList.append($hiveItem);

    // icon.url = orangeMapIcon;
    // icon.url = fatOrangeMapIcon;
    icon.url = bagMapIcon;

    if (hiveList == $hiveListAttractions) {
        icon.url = cameraMapIcon;
    } 
    else if (hiveList == $hiveListRestaurants) {
        icon.url = restaurantMapIcon;
    }

    const { marker } = createMarker(locationInfo, icon); 
    // marker.setMap(null); 

    hiveList.markers = hiveList.markers || [];
    hiveList.markers.push(marker);
}


// $toggleHive.addEventListener('click', e => {
//     const $hive = $hiveList.closest('.hive');
//     $hive.classList.toggle('hide');
//     $hiveWrapper.querySelector('.toggle-hive-filters-wrapper').classList.toggle('hide');

//     if ($hive.classList.contains('hide')) {
//         $hiveList.markers.forEach(marker => marker.setMap(null));  

//         const $hiveFilters = $hiveWrapper.querySelector('.hive-filters'); 
//         if (!$hiveFilters.classList.contains('hide')) {
//             $toggleHiveFilters.click(); 
//         }

//     }
//     else {
//         $hiveList.markers.forEach(marker => marker.setMap(map));   
//     }  
// });

// $toggleHiveFilters.addEventListener('click', e => {
//     $hiveWrapper.querySelector('.hive-filters').classList.toggle('hide');
// });

$addFilters.addEventListener('click', e => {
    if (!e.target.closest('.remove-filter')) return;
    alertify.confirm('Remove Filter?\nPlease confim',
        () => {
            // alertify.success('Ok');
            e.target.closest('.add-filter').remove();
        },
        () => {
            // alertify.error('Marker removal terribly failed!');
            console.log('Not removed');
    });
});

// $addFilterBtn.addEventListener('click', e => {
//     const $clone = e.target.closest('.add-filter-btn-wrap').querySelector('.add-filter-sample').cloneNode(true);
//     $clone.classList.remove('hide');
//     $addFilters.querySelector('.add-filters-wrap').append($clone);
// });

function populateFilterInputs(hiveItem) {
    const filterObj = hiveItem.locationInfo.filter; 
    const filterEls = [...$addFilters.querySelectorAll('.add-filters-wrap .add-filter')];
    const $filtersWrap = $addFilters.querySelector('.add-filters-wrap'); 

    const $neighborhoodSelect = $filtersWrap.querySelector('.add-filter [data-filter=neighborhood]'); 
    $neighborhoodSelect.selectedIndex = 0;
    $filtersWrap.querySelectorAll('input[type=checkbox]:checked').forEach(checkbox => {
        checkbox.checked = false;
    });

    for (const [key, val] of Object.entries(filterObj)) {

        if (key.includes('neighborhood')) {
            $neighborhoodSelect.value = val.trim().toLowerCase().replace(/\s+/g,'-');
        }
        else {
            val.split(',').forEach(v => {
                v = v.trim().toLowerCase().replace(/\s+/g,'-'); 
                const $checkbox = $filtersWrap.querySelector(`.add-filter input[type=checkbox][name="${v}-filter"]`); 
                if ($checkbox) $checkbox.checked = true; 
            });
        }

        /*
        $addFilters.querySelectorAll('.add-filters-wrap .add-filter').forEach(filter => {
            const $label = filter.querySelector('label'); 
            if ($label && $label.textContent.toLowerCase().includes('neighborhood')) {
                console.log('neighborhood', neighborhood)
                filter.querySelector('select').value = val; 
            }

            const $legend = filter.querySelector('legend');
            if ($legend) {
                const legendTxt = $legend.textContent.trim().toLowerCase().replace(/\s+/g,'-').replace(/[^a-z0-9\-\_]/g,''); 
                if (key === legendTxt) {
                    console.log('val', val)
                    val.split(',').forEach(v => {
                        console.log('v', v)
                        console.log('v el:', filter.querySelector(`input[type=checkbox][name="${v}-filter"]`))
                        filter.querySelector(`input[type=checkbox][name="${v}-filter"]`).checked = true; 
                    });
                }
            }
        });
        */

        /*
        const el = filterEls.filter(el => {
            let labelTxt;
            if (el.querySelector('label')) {
                labelTxt = el.querySelector('label').textContent.trim().toLowerCase().replace(/\s+/g,'-').replace(/[^a-z0-9\-\_]/g,''); 
            }
            else {
                labelTxt = el.querySelector('legend').textContent.trim().toLowerCase().replace(/\s+/g,'-').replace(/[^a-z0-9\-\_]/g,''); 
            }

            return key === labelTxt ? el : false;
            // if (key === labelTxt) {
            //     return el; 
            // }
            // else {
            //     return false;
            // }
        });

        if (el) {
            el[0].querySelector('.add-filter-input').value = val;

            const $label = el[0].querySelector('label'); 
            if ($label && $label.textContent.toLowerCase().includes('neighborhood')) {
                el[0].querySelector('select').value = val; 
            }

            const $legend = el[0].querySelector('legend'); 
            if ($legend) {
                if ($legend.textContent.toLowerCase().includes('type'))
            }
        }
        else {
            const $addFiltersContainer = $addFilters.querySelector('.add-filters-wrap');
            const $clone = $addFiltersContainer.querySelector('.add-filter.hide').cloneNode(true);
            $clone.classList.remove('hide');
            $clone.querySelector('label').textContent = key.charAt(0).toUpperCase() + key.substring(1);
            $clone.querySelector('.add-filter-input').value = val;
            $addFiltersContainer.append($clone);
        }
        */
    }

    if (hiveItem.locationInfo.dayEventName) $userSearch.value = hiveItem.locationInfo.dayEventName; 
}

$hiveList.addEventListener('click', e => {
    if (!e.target.closest('.hive-item')) return;
    const $hiveItem = e.target.closest('.hive-item');
    
    if ($hiveItem.classList.contains('active')) {
        $hiveItem.classList.remove('active');
        markerPopup.close();
    }
    else {
        const $allHiveItems = $hiveList.querySelectorAll('.hive-item'); 
        $allHiveItems.forEach(item => item.classList.remove('active'));
        $hiveItem.classList.add('active');
        const hiveItemPos = [...$allHiveItems].indexOf($hiveItem);
        const marker = $hiveList.markers[hiveItemPos];
        openMarkerWithInfo(marker, $hiveItem);
        populateFilterInputs($hiveItem); 
    } 
});

$hiveListAttractions.addEventListener('click', e => {
    if (!e.target.closest('.hive-item')) return;
    const $hiveItem = e.target.closest('.hive-item');
    
    if ($hiveItem.classList.contains('active')) {
        $hiveItem.classList.remove('active');
        markerPopup.close();
    }
    else {
        const $allHiveItems = $hiveListAttractions.querySelectorAll('.hive-item'); 
        $allHiveItems.forEach(item => item.classList.remove('active'));
        $hiveItem.classList.add('active');
        const hiveItemPos = [...$allHiveItems].indexOf($hiveItem);
        const marker = $hiveListAttractions.markers[hiveItemPos];
        openMarkerWithInfo(marker, $hiveItem);
    } 
});

$hiveListRestaurants.addEventListener('click', e => {
    if (!e.target.closest('.hive-item')) return;
    const $hiveItem = e.target.closest('.hive-item');
    
    if ($hiveItem.classList.contains('active')) {
        $hiveItem.classList.remove('active');
        markerPopup.close();
    }
    else {
        const $allHiveItems = $hiveListRestaurants.querySelectorAll('.hive-item'); 
        $allHiveItems.forEach(item => item.classList.remove('active'));
        $hiveItem.classList.add('active');
        const hiveItemPos = [...$allHiveItems].indexOf($hiveItem);
        const marker = $hiveListRestaurants.markers[hiveItemPos];
        openMarkerWithInfo(marker, $hiveItem);
    } 
});

function openMarkerWithInfo(marker, $hiveItem) {
    map.panTo(marker.position); 

    const { name, rating, reviews, operatingHours, phoneNumber, address } = $hiveItem.locationInfo;
    const ratingTag = `<meter class="average-rating" min="0" max="5" value="${rating}" title="${rating} out of 5 stars">${rating} out of 5</meter>`;

    const contentString = `
    <div class="location-popup-content">
    <div class="location-row location-title">${name}</div>
        <div class="location-row">${rating ? `Rating: ${rating} ${ratingTag}` : '<i>missing_rating</i>'}</div>
        <div class="location-row location-reviews">${reviews 
        ? `<div class="view-reviews"><span class="view-reviews-text">View Reviews</span> <i class="arrow right"></i></div><div class="reviews-list hide">${reviews}</div>`
        : '<i>missing_reviews</i>'}</div> 
        </div>
        <div class="location-row location-operating-hrs">${operatingHours ? operatingHours : '<i>missing_operating_hours</i>'}</div>
        <div class="location-row">Phone Number: ${phoneNumber ? `<a href="${phoneNumber}">${phoneNumber}</a>` : '<i>missing_contact</i>'}</div>
        <div class="location-row">Website: ${address ? `<a target="_blank" href="${address}">Visit Site</a>` : '<i>missing_link</i>'}</div>
        `; 

    markerPopup.close();
    markerPopup.setContent(contentString);
    markerPopup.open(marker.getMap(), marker);
}

$map.addEventListener('click', e => { 
    if (!e.target.closest('.view-reviews')) return;
    const $locationReviews = e.target.closest('.location-reviews'); 
    const $arrow = e.target.closest('.view-reviews').querySelector('.arrow'); 
    if ($arrow.classList.contains('right')) {
        $arrow.classList.remove('right');
        $arrow.classList.add('down');
        $locationReviews.querySelector('.reviews-list').classList.remove('hide');
    }
    else {
        $arrow.classList.remove('down');
        $arrow.classList.add('right');
        $locationReviews.querySelector('.reviews-list').classList.add('hide');
    }
});

$hiveFilterCheckboxes.forEach(checkbox => {
    checkbox.addEventListener('click', e => {
        // const $hiveList = e.currentTarget.closest('.section').querySelector('.khonsu-data');
        const $hiveItems = $hiveList.querySelectorAll('.hive-item');    
        $hiveItems.forEach(item => item.classList.add('hide'));

        $hiveList.markers?.forEach(marker => marker.setMap(null)); 

        const activeCheckboxes = [...$hiveFieldsets.querySelectorAll('input[type=checkbox]:checked')].reduce((o, c) => {
            const group = c.closest('.hive-filter-wrapper-fieldset').querySelector('legend')
                            .textContent.trim().toLowerCase()
                            .replace(/\s+/g,'-');
            let checkboxName = c.name.toLowerCase().trim().replace('-2','').replace('-3','');
            if (o[group]) {
                checkboxName = `${o[group]},${checkboxName}`;
            } 
            o[group] = checkboxName; 
            return o; 
        }, {});
        
        console.log('activeCheckboxes', activeCheckboxes)

        $hiveList.querySelectorAll('.hive-item').forEach((hiveItem, i) => {
            const filterObj = hiveItem.locationInfo.filter;
            if (!filterObj) return; 

            const matchesArr = [];

            for (let [filterKey, filterVal] of Object.entries(filterObj)) {
                if (!filterVal.trim()) continue; 

                if (!activeCheckboxes[filterKey]) continue; 
                if (!activeCheckboxes[filterKey].trim()) continue; 

                console.log('activeCheckboxes[filterKey]', activeCheckboxes[filterKey])

                // console.log('filterVal:::::', filterVal)

                filterVal = filterVal.toLowerCase().trim().replace(/\s+/g,'-');  
                // const matches = [...activeCheckboxes[filterKey]].every(val => {
                //     console.log('VAL', val)
                //     return filterVal.includes(val)
                // });

                // if (!activeCheckboxes[filterKey].trim()) return;
                console.log('filterKey', filterKey) 
                console.log('filterVal', filterVal)
                console.log('activeCheckboxes[filterKey].split(',')', activeCheckboxes[filterKey].split(','))
                const matches = activeCheckboxes[filterKey].split(',').every(val => {
                    // console.log('VAL', val)
                    // console.log('val.trim()', val.trim())
                    // console.log('filterVal', filterVal)
                    return filterVal.includes(val)
                });

                // console.log('filterVal', filterVal)
                // console.log('matches', matches)

                matchesArr.push(matches);
            }

            if (matchesArr.length && matchesArr.every(Boolean)) {
                hiveItem.classList.remove('hide');

                console.log('hiveItem', hiveItem)

                // const filterObj = hiveItem.locationInfo.filter;
                // console.log('filterObj:', filterObj)

                const hiveItemPos = [...$hiveItems].indexOf(hiveItem);
                const marker = $hiveList.markers[hiveItemPos];
                marker.setMap(map); 
            }
        });

        if (!Object.keys(activeCheckboxes).length && $hiveList.querySelectorAll('.hive-item:not(.hide)').length === 0) {
            // console.log('HIT::::::::::::::::::::::::::::::::::::::::::::')
            // console.log('activeCheckboxes', activeCheckboxes)
            // console.log('activeCheckboxes.length', activeCheckboxes.length)
            $hiveItems.forEach(item => item.classList.remove('hide'));
            $hiveList.markers.forEach(marker => marker.setMap(map)); 
        }

        const locationsNum = $hiveList.querySelectorAll('.hive-item:not(.hide)').length;
        $hiveList.closest('.hive').querySelector('.item-no').textContent = `${locationsNum} locations`;
    });
});

document.querySelectorAll('[data-type="attractions"] .hive-filters input[type="checkbox"]').forEach(checkbox => {
    checkbox.addEventListener('click', e => {
        // const $hiveList = e.currentTarget.closest('.section').querySelector('.khonsu-data');
        const $hiveItems = $hiveListAttractions.querySelectorAll('.hive-item');    
        $hiveItems.forEach(item => item.classList.add('hide'));

        $hiveListAttractions.markers.forEach(marker => marker.setMap(null)); 

        const activeCheckboxes = [...document.querySelector('[data-type="attractions"] .hive-filters').querySelectorAll('input[type=checkbox]:checked')].map(c => {
            const group = c.closest('.hive-filter-wrapper-fieldset').querySelector('legend')
                            .textContent.trim().toLowerCase()
                            .replace(/\s+/g,'-');
            const checkboxName = c.name.toLowerCase().trim().replace('-2','').replace('-3','');
            return [group, checkboxName]; 
        }); //.join(); 
        
        $hiveListAttractions.querySelectorAll('.hive-item').forEach((hiveItem, i) => {
            const filterObj = hiveItem.locationInfo.filter;
            if (!filterObj) return; 

            for (const [filterKey, filterVal] of Object.entries(filterObj)) {
                if (!filterVal.trim()) continue; 

                activeCheckboxes.forEach(c => {
                    if (!filterKey.trim().toLowerCase().replace(/\s+/g,'-').includes(c[0].toLowerCase())) return;
                    if (!filterVal.trim().toLowerCase().replace(/\s+/g,'-').includes(c[1].toLowerCase())) return;

                    hiveItem.classList.remove('hide');
                    
                    const hiveItemPos = [...$hiveItems].indexOf(hiveItem);
                    const marker = $hiveListAttractions.markers[hiveItemPos];
                    marker.setMap(map); 
                });
            }
        });

        if (!activeCheckboxes.length && $hiveListAttractions.querySelectorAll('.hive-item:not(.hide)').length === 0) {
            $hiveItems.forEach(item => item.classList.remove('hide'));
            $hiveListAttractions.markers.forEach(marker => marker.setMap(map)); 
        }

        const locationsNum = $hiveListAttractions.querySelectorAll('.hive-item:not(.hide)').length;
        $hiveListAttractions.closest('.hive-attr').querySelector('.item-no').textContent = `${locationsNum} locations`;
    });
});

document.querySelectorAll('[data-type="restaurants"] .hive-filters input[type="checkbox"]').forEach(checkbox => {
    checkbox.addEventListener('click', e => {
        // const $hiveList = e.currentTarget.closest('.section').querySelector('.khonsu-data');
        const $hiveItems = $hiveListRestaurants.querySelectorAll('.hive-item');    
        $hiveItems.forEach(item => item.classList.add('hide'));

        $hiveListRestaurants.markers.forEach(marker => marker.setMap(null)); 

        const activeCheckboxes = [...document.querySelector('[data-type="restaurants"] .hive-filters').querySelectorAll('input[type=checkbox]:checked')].map(c => {
            const group = c.closest('.hive-filter-wrapper-fieldset').querySelector('legend')
                            .textContent.trim().toLowerCase()
                            .replace(/\s+/g,'-');
            const checkboxName = c.name.toLowerCase().trim().replace('-2','').replace('-3','');
            return [group, checkboxName]; 
        }); //.join(); 
        
        $hiveListRestaurants.querySelectorAll('.hive-item').forEach((hiveItem, i) => {
            const filterObj = hiveItem.locationInfo.filter;
            if (!filterObj) return; 

            for (const [filterKey, filterVal] of Object.entries(filterObj)) {
                if (!filterVal.trim()) continue; 

                activeCheckboxes.forEach(c => {
                    if (!filterKey.trim().toLowerCase().replace(/\s+/g,'-').includes(c[0].toLowerCase())) return;
                    if (!filterVal.trim().toLowerCase().replace(/\s+/g,'-').includes(c[1].toLowerCase())) return;

                    hiveItem.classList.remove('hide');
                    
                    const hiveItemPos = [...$hiveItems].indexOf(hiveItem);
                    const marker = $hiveListRestaurants.markers[hiveItemPos];
                    marker.setMap(map); 
                });
            }
        });

        if (!activeCheckboxes.length && $hiveListRestaurants.querySelectorAll('.hive-item:not(.hide)').length === 0) {
            $hiveItems.forEach(item => item.classList.remove('hide'));
            $hiveListRestaurants.markers.forEach(marker => marker.setMap(map)); 
        }

        const locationsNum = $hiveListRestaurants.querySelectorAll('.hive-item:not(.hide)').length;
        $hiveListRestaurants.closest('.hive-rest').querySelector('.item-no').textContent = `${locationsNum} locations`;
    });
});

function createMarker(place, mapIcon=icon) {
    let { name, formatted_address, geometry, latLng, website:address, 
        current_opening_hours, opening_hours, formatted_phone_number:phoneNumber, 
        reviews, rating } = place; 
    let operatingHrs, reviewsContent, ratingTag; 

    // console.log('place', place)

    /*const hiveObj = {
        dayEventName,
        lat,
        lng,
        title,
        rating,
        reviews: reviewsContent,
        operatingHours: operatingHrs,
        phoneNumber,
        address,
    }*/

    // console.log('rating:::::', rating)
    // console.log('reviews:::::', reviews)
    // console.log('address:::::', address)
    // console.log('phoneNumber:::::', phoneNumber)
    // console.log('current_opening_hours:::::', current_opening_hours)
    // console.log('opening_hours:::::', opening_hours)

    if (!phoneNumber) phoneNumber = place.phoneNumber;
    if (!address) address = place.address || place.website;
    if (!operatingHrs) operatingHrs = place.operatingHours;

    // console.log(
    //     'address:', address,
    //     '\nphoneNumber:', phoneNumber
    // )

    // console.log('the place', place)  

    // console.log('current_opening_hours', place.current_opening_hours)
    // console.log('opening_hours', place.opening_hours)

    // const locationName = `${name} ${formatted_address}`; 
    let hrs;
    if (opening_hours) hrs = opening_hours.weekday_text;
    if (current_opening_hours) hrs = current_opening_hours.weekday_text;

    // const hrs = current_opening_hours ? current_opening_hours.weekday_text : opening_hours.weekday_text; 

    // if(!hrs) return; 

    // console.log('geometry', geometry, 'geometry.location', geometry.location) 

    const position = geometry ? geometry.location : latLng; 

    const marker = new google.maps.Marker({
        map,
        icon: mapIcon,
        title : name, 
        position : position,  
    });

    
    if(hrs) {
        if (isString(hrs)) {
            operatingHrs = hrs;
        }
        else {
            operatingHrs = hrs.map(hr => {
                return `<div>${hr}</div>`;
            }).join('');
        }
    }

    if (reviews) {
        if (isString(reviews)) {
            reviewsContent = reviews;
        }
        else {
            reviewsContent = reviews.map(review => {
                const { author_name, author_url, profile_photo_url, rating, relative_time_description, text } = review;
                return `<div class="review-data">
                <div class="review-data-row location-review-pic">${profile_photo_url ? `<img src="${profile_photo_url}">` : ''}</div>  
                <div class="review-data-row location-review-time">${relative_time_description ? relative_time_description : '<i>missing_time_posted</i>'}</div>
                <div class="review-data-row location-review-title"><a href="${author_url ? author_url : '#'}">${author_name}</a></div>
                <div class="review-data-row location-review-rating">Rating: ${rating}</div>
                <div class="review-data-row location-review-text">${text}</div>
                </div>`;
            }).join('');  
        }
    }

    if (rating) {
        ratingTag = `<meter class="average-rating" min="0" max="5" value="${rating}" title="${rating} out of 5 stars">${rating} out of 5</meter>`;
    } 

    const contentString = `
    <div class="location-popup-content">
    <div class="location-row location-title">${name}</div>
      <div class="location-row">${rating ? `Rating: ${rating} ${ratingTag}` : '<i>missing_rating</i>'}</div>
      <div class="location-row location-reviews">${reviewsContent 
        ? `<div class="view-reviews"><span class="view-reviews-text">View Reviews</span> <i class="arrow right"></i></div><div class="reviews-list hide">${reviewsContent}</div>`
        : '<i>missing_reviews</i>'}</div> 
      </div>
      <div class="location-row location-operating-hrs">${operatingHrs ? operatingHrs : '<i>missing_operating_hours</i>'}</div>
      <div class="location-row">Phone Number: ${phoneNumber ? `<a href="${phoneNumber}">${phoneNumber}</a>` : '<i>missing_contact</i>'}</div>
      <div class="location-row">Website: ${address ? `<a target="_blank" href="${address}">Visit Site</a>` : '<i>missing_link</i>'}</div>
      `;   

      // <div class="location-row">Phone Number: ${formatted_phone_number ? `<a href="${formatted_phone_number}">${formatted_phone_number}</a>` : '<i>missing_contact</i>'}</div>
      // <div class="location-row">Website: ${website ? `<a href="${website}">Visit Site</a>` : '<i>missing_link</i>'}</div>

    marker.addListener('click', () => { 
        markerPopup.close();
        // markerPopup.setContent(marker.getTitle());
        markerPopup.setContent(contentString);
        markerPopup.open(marker.getMap(), marker);
    });

    // return { marker, reviewsContent, operatingHrs, formatted_phone_number, website }; 
    return { marker, rating, reviewsContent, operatingHrs, phoneNumber, address, contentString }; 
} 

function isString(x) {
    return Object.prototype.toString.call(x) === '[object String]';
}

$dataTypeSelect.addEventListener('change', e => {
    const val = e.currentTarget.value.toLowerCase().trim();
    $dataTypeSections.forEach(sec => {
        sec.classList.add('hide');
        sec.classList.remove('active');
    });
    if (val.includes('retail')) {
        $retailSections.forEach(sec => {
            sec.classList.remove('hide');
            sec.classList.add('active');
        }); 
        $hiveListAttractions.markers?.forEach(marker => marker.setMap(null)); 
        $hiveListRestaurants.markers?.forEach(marker => marker.setMap(null)); 
        $hiveList.markers?.forEach(marker => marker.setMap(map)); 
    }
    else if (val.includes('attractions')) {
        $attractionsSections.forEach(sec => {
            sec.classList.remove('hide');
            sec.classList.add('active');
        }); 
        $hiveList.markers?.forEach(marker => marker.setMap(null)); 
        $hiveListAttractions.markers?.forEach(marker => marker.setMap(map)); 
        $hiveListRestaurants.markers?.forEach(marker => marker.setMap(null)); 
    }
    else if (val.includes('restaurants')) {
        $restaurantsSections.forEach(sec => {
            sec.classList.remove('hide');
            sec.classList.add('active');
        }); 
        $hiveList.markers?.forEach(marker => marker.setMap(null)); 
        $hiveListAttractions.markers?.forEach(marker => marker.setMap(null)); 
        $hiveListRestaurants.markers?.forEach(marker => marker.setMap(map)); 
    }
});

// const saveEntryBtnTxt = $saveEntryBtn.value;
$saveEntryBtn.addEventListener('click', e => {
    const $btn = e.currentTarget;
    const btnTxt = $btn.value;
    const $sideBar = e.currentTarget.closest('.side-bar');
    const $userSearch = $sideBar.querySelector('.user-search');

    const $filtersWrap = $sideBar.querySelector('.add-filters-wrap:not(.hide)');

    let neighborhood = '';
    const filter = {};

    $filtersWrap.querySelectorAll('.add-filter:not(.hide)').forEach(filterSec => {
        if (filterSec.querySelector('select')) {
            neighborhood = filterSec.querySelector('select').value; 
        }
        else {
            console.log('filterSec', filterSec)
            const groupName = filterSec.querySelector('legend').textContent.trim().toLowerCase().replace(/\s+/g,'-');
            const group = [...filterSec.querySelectorAll('input[type=checkbox]:checked')].map(checkbox => {
                return checkbox.name.replace('-filter', ''); 
            }).join();
            filter[groupName] = group;
        }
    });

    filter.neighborhood = neighborhood;

    const type = $dataTypeSelect.value.toLowerCase().trim();

    console.log('filter:', filter)

    let hive, hiveList;

    if (type.includes('retail')) {
        hive = 'hive';
        hiveList = $hiveList;
    }
    else if (type.includes('attractions')) {
        hive = 'hive_attr';
        hiveList = $hiveListAttractions;
    }
    else if (type.includes('restaurants')) {
        hive = 'hive_rest';
        hiveList = $hiveListRestaurants;
    }

    const userMail = localStorage['user-email'];
    saveMarkerToFirebase(userMail, hive, filter); 

    const {
        dayEventName,
        lat,
        lng,
        title,
        rating,
        reviewsContent: reviews,
        operatingHrs: operatingHours,
        phoneNumber,
        address,
    } = $saveEntryBtn.hiveObj;

    const hiveItemData = { dayEventName, title, lat, lng, rating, reviews, operatingHours, phoneNumber, address, filter }; 

    addToHive(hiveItemData, hiveList); 

    $btn.value = 'Submitted!!';
    setTimeout(()=> {
        $btn.value = btnTxt;
        refreshAddToDBFields(); 
    }, 2000);
});

function refreshAddToDBFields() {
    $userSearch.value = '';  
    const $filtersWrap = $addFilters.querySelector('.add-filters-wrap'); 
    $filtersWrap.querySelector('.add-filter [data-filter=neighborhood]').selectedIndex = 0;
    $filtersWrap.querySelectorAll('input[type=checkbox]:checked').forEach(checkbox => {
        checkbox.checked = false;
    });
    markerPopup.close();
}

async function saveMarkerToFirebase(userMail, hive, filter) { 
    const userData = doc(db, 'travelData', `user-${userMail}`);

    const {
        dayEventName,
        lat,
        lng,
        title,
        rating,
        reviewsContent: reviews,
        operatingHrs: operatingHours,
        phoneNumber,
        address,
    } = $saveEntryBtn.hiveObj;

    const hiveObj = { dayEventName, lat, lng, title, rating, reviews, operatingHours, phoneNumber, address, filter };

    const dataObj = {}; 
    dataObj[hive] = arrayUnion(hiveObj); 
    dataObj.modifiedAt = serverTimestamp(); 

    await updateDoc(userData, dataObj);
}



