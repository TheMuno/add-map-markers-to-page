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
    $addToHiveBtn = document.querySelector('.add-to-hive'),
    $hiveWrapper = document.querySelector('.toggle-hive-wrapper'), 
    // $toggleHive = $hiveWrapper.querySelector('.toggle-hive'),
    // $toggleHiveFilters = $hiveWrapper.querySelector('.toggle-hive-filters'),
    $hiveFieldsets = document.querySelector('.hive-fieldsets'),
    $hiveFilterCheckboxes = $hiveWrapper.querySelectorAll('.hive-filter input'),
    toggleHiveInitialText = $hiveWrapper.querySelector('label').textContent,
    $hiveList = document.querySelector('.khonsu-data.hive .hive-list'),
    $hiveListAttractions = document.querySelector('.hive-list.attractions'),
    // $dayActivities = document.querySelector('.day-events');
    $dataTypeSelect = document.querySelector('.data-type-select'),
    $dataTypeSections = document.querySelectorAll('[data-type]'),
    $retailSection = document.querySelector('[data-type="retail"]'),
    $attractionsSection = document.querySelector('[data-type="attractions"]');

const mapZoom = 13,
    initialCoords  = { lat: 40.7580, lng: -73.9855 },
    mapIcon = 'https://uploads-ssl.webflow.com/61268cc8812ac5956bad13e4/64ba87cd2730a9c6cf7c0d5a_pin%20(3).png', 
    orangeMapIcon = 'Imgs/pin_orange.png',
    cameraMapIcon = 'Imgs/camera-pin.png';

let map; 

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

    // Create the search box and link it to the UI element.
    // const searchBox = new google.maps.places.SearchBox($address);
    
    // Bias the SearchBox results towards current map's viewport 
    // map.addListener('bounds_changed', () => {
    //     searchBox.setBounds(map.getBounds()); 
    // });
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
    const { hive, hive_att } = data;

    console.log('The Hive:', hive)

    hive.forEach(hiveItem => addToHive(hiveItem, $hiveList));
    hive_att.forEach(hiveItem => addToHive(hiveItem, $hiveListAttractions));

}

function addToHive(hiveItem, hiveList) {
    const { dayEventName, title, lat, lng, rating, reviews, operatingHours, phoneNumber, address, filter } = hiveItem; 
    const locationInfo = {
        name: title,
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
    icon.url = cameraMapIcon;
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

        // console.log('e.currentTarget', e.currentTarget)
        // console.log('$hiveList', $hiveList)
        // console.log('$hiveList.markers', markers)

        $hiveList.markers.forEach(marker => marker.setMap(null)); 

        const activeCheckboxes = [...$hiveFieldsets.querySelectorAll('input[type=checkbox]:checked')].map(c => {
            const group = c.closest('.hive-filter-wrapper-fieldset').querySelector('legend')
                            .textContent.trim().toLowerCase()
                            .replace(/\s+/g,'-');
            const checkboxName = c.name.toLowerCase().trim();
            return [group, checkboxName]; 
        }); //.join(); 
        
        // console.log('activeCheckboxes', activeCheckboxes)

        $hiveList.querySelectorAll('.hive-item').forEach((hiveItem, i) => {
            const filterObj = hiveItem.locationInfo.filter;
            if (!filterObj) return; 

            // console.log('filterObj', filterObj)
            // console.log('activeCheckboxes', activeCheckboxes)

            for (const [filterKey, filterVal] of Object.entries(filterObj)) {
                if (!filterVal.trim()) continue; 

                activeCheckboxes.forEach(c => {
                    // if (filterVal.includes(filterObj[c[0]]))

                    // console.log('filterKey', filterKey)
                    // console.log('filterVal', filterVal)

                    if (!filterKey.toLowerCase().includes(c[0].toLowerCase())) return;
                    if (!filterVal.toLowerCase().includes(c[1].toLowerCase())) return;

                    hiveItem.classList.remove('hide');

                    // console.log(hiveItem)
                    
                    const hiveItemPos = [...$hiveItems].indexOf(hiveItem);
                    const marker = $hiveList.markers[hiveItemPos];
                    marker.setMap(map); 
                });

                // console.log('filterKey', filterKey)
                // console.log('filterVal', filterVal) 
    
                // const filterValExists = filterVal.split(',').filter(f => activeCheckboxes.includes(f.trim())).length; 

                // console.log('filterValExists', filterValExists)
       
                // if (filterValExists) {
                //     hiveItem.classList.remove('hide');
                    
                //     const hiveItemPos = [...$hiveItems].indexOf(hiveItem);
                //     const marker = $hiveList.markers[hiveItemPos];
                //     marker.setMap(map); 

                //     console.log(hiveItem)
                // }
            }
        });

        if (!activeCheckboxes.length && $hiveList.querySelectorAll('.hive-item:not(.hide)').length === 0) {
            $hiveItems.forEach(item => item.classList.remove('hide'));
            $hiveList.markers.forEach(marker => marker.setMap(map)); 
        }
    });
});

/*
$hiveFilterCheckboxes.forEach(checkbox => {
    checkbox.addEventListener('click', e => {
        // const $btn = e.currentTarget; //.querySelector('input[type=checkbox]');
        // const btnVal = $btn.name; 
        // const btnGroup = $btn.closest('.hive-filter-wrapper-fieldset').querySelector('legend')
        //                     .textContent.trim().toLowerCase()
        //                     .replace(/\s+/g,'-');
        const $hiveItems = $hiveList.querySelectorAll('.hive-item');

        // console.log('btnVal', btnVal) 
        // console.log('btnGroup', btnGroup) 
    
        $hiveItems.forEach(item => item.classList.add('hide'));

        const activeCheckboxes = [...$hiveFieldsets.querySelectorAll('input[type=checkbox]:checked')].map(c => c.name.toLowerCase().trim()).join();  

        $hiveList.querySelectorAll('.hive-item').forEach((hiveItem, i) => {
            const filterObj = hiveItem.locationInfo.filter;
            if (!filterObj) return; 

            // console.log('filterObj', filterObj) 

            for (const [filterKey, filterVal] of Object.entries(filterObj)) {
                // if (!btnGroup.includes(filterKey)) continue;
                if (!filterVal.trim()) continue; 

                // console.log('filterKey', filterKey) 
                console.log('filterVal', filterVal) 
                console.log('activeCheckboxes', activeCheckboxes)
    
                const filterValExists = filterVal.split(',').filter(f => activeCheckboxes.includes(f)).length; 
                // if (filterVal.includes(btnVal)) {
                // if (activeCheckboxes.includes(filterVal)) {
                if (filterValExists) {
                    hiveItem.classList.remove('hide');
                    // hiveItem.classList.add('got-it');
                    console.log(hiveItem)
                }
            }
        });
    });
});
*/

// document.querySelector('.view-hive-btn').addEventListener('click', e => {
//     window.location = '/hive.html';
// });

function createMarker(place, mapIcon=icon) {
    let { name, formatted_address, geometry, latLng, website:address, 
        current_opening_hours, opening_hours, formatted_phone_number:phoneNumber, 
        reviews, rating } = place; 
    let operatingHrs, reviewsContent, ratingTag; 

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
    return { marker, rating, reviewsContent, operatingHrs, phoneNumber, address }; 
} 

function isString(x) {
    return Object.prototype.toString.call(x) === '[object String]';
}

$dataTypeSelect.addEventListener('change', e => {
    const val = e.currentTarget.value.toLowerCase().trim();
    $dataTypeSections.forEach(section => section.classList.add('hide'));
    if (val.includes('retail')) {
        $retailSection.classList.remove('hide');
        $hiveListAttractions.markers.forEach(marker => marker.setMap(null)); 
        $hiveList.markers.forEach(marker => marker.setMap(map)); 
    }
    else if (val.includes('attractions')) {
        $attractionsSection.classList.remove('hide');
        $hiveList.markers.forEach(marker => marker.setMap(null)); 
        $hiveListAttractions.markers.forEach(marker => marker.setMap(map)); 
    }
});

