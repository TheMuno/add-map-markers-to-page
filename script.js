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

let map; 

if (!localStorage.getItem('user-email'))
localStorage.setItem('user-email', 'one@mail.com');  




document.querySelector('.user-email').addEventListener('change', e => {
    localStorage.setItem('user-email', e.currentTarget.value);
    window.location.reload(); 
});


const $map = document.querySelector('#map'),
    $userMail = document.querySelector('.user-email'), 
    $address = document.querySelector('.user-input'),
    $addressPlaceholder = $address.getAttribute('placeholder'),
    $daysSelect = document.querySelector('#days-select'), 
    // $addDay = document.querySelector('.add-day'),
    $dayActivities = document.querySelector('.day-events'),
    $allDays = document.querySelector('.day-events .all-days'),
    $noDays = document.querySelector('.day-events .no-days'),
    $showRemoved = $dayActivities.querySelector('.show-removed'),
    // $downloadUserCSV = document.querySelector('.download-user-csv'), 
    // $downloadDBCSV = document.querySelector('.download-all-csv'),
    // $printedPlanBtn = document.querySelector('.printed-plan'),
    $khonsuNotes = document.querySelector('.section.notes'),
    $qrCodeContainer = document.querySelector('.khonsu-data.map-url-qrcode .map-url-qr'),
    // $hourlyBtn = document.querySelector('.view-hourly'),
    $addReservation = document.querySelector('.add-reservation'),
    $reservations = document.querySelector('.reservations'),
    // $hourEvents = document.querySelector('.hour-events'),
    // $dayTimeSectionsSelect = document.querySelector('.day-time-sections'),
    // $dayTimesSelect = document.querySelector('.day-times');
    $noUser = document.querySelector('.no-user'),
    $mapUrl = document.querySelector('.map-url-link input'),
    $mapResultsOverlay = document.querySelector('.map-results-overlay'),
    $mapResultsContent = $mapResultsOverlay.querySelector('.map-results-content');
    
    $userMail.value = localStorage.getItem('user-email') || 'one@mail.com'; 
    


// const $map = document.querySelector('.plan_map'),
//     $address = document.querySelector('#Activity-Name'),  
//     $daysSelect = document.querySelector('select#Day'), 
//     $addDay = document.querySelector('.add-day'),
//     $dayActivities = document.querySelector('.day-events'), 

const    $logoutBtn = document.querySelector('[data-wf-user-logout="Log out"]'), 
    mapZoom = 13,
    initialCoords  = { lat: 40.7580, lng: -73.9855 },
    mapIcon = 'https://uploads-ssl.webflow.com/61268cc8812ac5956bad13e4/64ba87cd2730a9c6cf7c0d5a_pin%20(3).png', 
    directionsUrlBase = 'https://www.google.com/maps/dir/?api=1', 
    // startingIndex = 1,
    googleSpreadsheetID = '1Zj1ae5faA8h7UwHvtYVtKoiA_G3LtQcuTOFV1Evq4BQ';   

let currentDay = {}; //$daysSelect.options[0];  // $daysSelect.options[startingIndex]; 
currentDay.markers = [];

console.log('currentDay', currentDay) 
console.log('currentDay.markers', currentDay.markers)

$daysSelect.selectedIndex = 0; // startingIndex;  

google.maps.event.addDomListener(window, 'load', () => {
    const userMail = localStorage.getItem('user-email');  
    if (userMail) retrieveSavedMarkersFromFirebase(userMail);

    if (!$allDays.innerHTML.trim()) {
        $address.setAttribute('disabled', true);
        $address.setAttribute('placeholder','No Travel Dates Added');
    }
}); 

$logoutBtn?.addEventListener('click', () => {
    localStorage.removeItem('user-email');
}); 

// $printedPlanBtn.addEventListener('click', e => {
//     window.open('./event-list.html')
// });



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

    // Request libraries when needed, not in the script tag.
    // const { Map } = await google.maps.importLibrary("maps");
    // // Short namespaces can be used.
    // map = new Map($map, {
    //     center: initialCoords,
    //     zoom: mapZoom,
    // });

    // Create the search box and link it to the UI element.
    const searchBox = new google.maps.places.SearchBox($address);
    
    // Bias the SearchBox results towards current map's viewport 
    map.addListener('bounds_changed', () => {
        searchBox.setBounds(map.getBounds()); 
    });

    searchBox.addListener('places_changed', (e) => { 
        const places = searchBox.getPlaces();
    
        if (places.length == 0) return;
    
        // For each place, get the icon, name and location.
        const bounds = new google.maps.LatLngBounds();

        $mapResultsContent.querySelector('.map-results').innerHTML = '';
        const numOfPlacesFound = places.length; 
        places.forEach((place) => {
            if (!place.geometry || !place.geometry.location) {
                alert('Sorry, try again\nNo cordinates found'); 
                return;
            }

            // console.log('place', place)  

            const marker = createMarker(place);   

            map.panTo(marker.position); 

            console.log('currentDay on Marker added:', currentDay)

            currentDay.markers = currentDay.markers || [];
            currentDay.markers.push(marker);

            const dayNum = getCurrentDayNum(); 
            // const day = `.day-${dayNum}-event:not(.hide)`;  

            const selectedIndex = $daysSelect.selectedIndex;
            let dayDate = $daysSelect.options[selectedIndex].value; 
            if (selectedIndex === 0) {
                dayDate = $daysSelect.options[ $daysSelect.options.length - 2 ]?.value; 
            }
            const dayIdentifier = `[day="${dayDate.trim()}"]`;
            // $dayActivities.querySelector(`${day} .single-event`)?.classList.add('hide');  

            const lat = marker.position.lat();
            const lng = marker.position.lng();
            const title = marker.title; 
 
            const markerObj = {lat, lng, title}; 

            $address.n = ($address.n || 1) + 1; 

            // let idNum = 2; 
            // const lastId = $dayActivities.querySelector(`${day} > .single-event:last-child:not(.hide)`)?.id;
            // if (lastId) {
            //     let num = Number(lastId.split('-')[0].slice(-1));  
            //     num += 1;
            //     idNum = num; 
            // }

            // const dayTimes = ['Morning', 'Afternoon', 'Evening'];
            // const clockTimes = ['08:00 AM', '09:00 AM', '10:00 AM', '11:00 AM', '12:00 PM', 
            //                     '01:00 PM', '02:00 PM', '03:00 PM', '04:00 PM', '05:00 PM', 
            //                     '06:00 PM', '07:00 PM', '08:00 PM', '09:00 PM', '10:00 PM',];
            // const timeOfDay = dayTimes[rand(0, 2)];
            // const timeExact = clockTimes[rand(0, 14)];

            markerObj.timeslot = 'Morning';
            markerObj.starttime = '08:00 AM';

            const eventId = dayDate.toLowerCase().replace(/,\s+|\s+/g,'-');
            let dayEventName = ''; 
            
            if (numOfPlacesFound > 1) {
                const addressName = `${place.name} ${place.formatted_address}`; 
                dayEventName = addressName; 

                // const markerObj = {lat, lng, title, dayEventName, timeOfDay}; 
                markerObj.dayEventName = dayEventName;
                
                // postDayActivity(addressName, dayIdentifier, marker, eventId, markerObj);

                const $mapResult = document.createElement('div');
                $mapResult.className = 'map-result';
                $mapResult.textContent = dayEventName;
                $mapResultsContent.querySelector('.map-results').append($mapResult);
                $mapResultsContent.querySelector('.results-header').textContent = $address.value.trim();
                $mapResultsOverlay.classList.remove('hide');
            }
            else {
                dayEventName = $address.value; 
                // const markerObj = {lat, lng, title, dayEventName, timeOfDay}; 
                markerObj.dayEventName = dayEventName;
                // markerObj.timeOfDay = timeOfDay;
                // markerObj.timeExact = timeExact;
                postDayActivity($address.value, dayIdentifier, marker, eventId, markerObj);
            }


            // markerObj.dayEventName = dayEventName;             

            const userMail = localStorage.getItem('user-email');
            // if (userMail) saveMarkerToFirebase(userMail, dayDate, markerObj); 
            if (userMail) saveMarkerToFirebase(userMail, dayNum, dayDate, markerObj);   

        });

        $address.value = '';  
    });

    function rand(min, max) { 
        return Math.floor(Math.random() * (max - min + 1) + min)
    }
}();

function createMarker(place) {
    const { name, formatted_address, geometry, latLng, website, current_opening_hours, opening_hours, formatted_phone_number, reviews } = place; 

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
        icon,
        title : name, 
        position : position,  
    });

    let operatingHrs, reviewsContent; 
    if(hrs) {
        operatingHrs = hrs.map(hr => {
            return `<div>${hr}</div>`;
        }).join('');
    }

    if (reviews) {
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

    const contentString = `
    <div class="location-popup-content">
    <div class="location-row location-title">${name}</div>
      <div class="location-row">Website: ${website ? `<a href="${website}">Visit Site</a>` : '<i>missing_link</i>'}</div>
      <div class="location-row">Phone Number: ${formatted_phone_number ? `<a href="${formatted_phone_number}">${formatted_phone_number}</a>` : '<i>missing_contact</i>'}</div>
      <div class="location-row location-operating-hrs">${operatingHrs ? operatingHrs : '<i>missing_operating_hours</i>'}</div>
      <div class="location-row location-reviews">${reviewsContent 
        ? `<div class="view-reviews"><span class="view-reviews-text">View Reviews</span> <i class="arrow right"></i></div><div class="reviews-list hide">${reviewsContent}</div>`
        : '<i>missing_reviews</i>'}</div> 
    </div>`;   

    marker.addListener('click', () => { 
        markerPopup.close();
        // markerPopup.setContent(marker.getTitle());
        markerPopup.setContent(contentString);
        markerPopup.open(marker.getMap(), marker);
    });

    return marker; 
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


function postDayActivity(dayEvent, day, marker, eventId, markerObj) {
    const $day = $dayActivities.querySelector(day);  
    if ($day) {
        constructActivity(dayEvent, day, marker, eventId, markerObj); 
    }
    else {
        console.log('No Day found to add in activities')
    }
    // else {
    //     const dayNum = day.split('-')[1]; 
    //     addDayActivitiesListContainer(dayNum); 
    //     constructActivity(dayEvent, day, marker, eventId, markerObj); 

    //     // if ($dayActivities.querySelector(`.day-${dayNum}-event`)) {
    //     //     const $hiddenEvent = $dayActivities.querySelector(`.day-${dayNum}-event`).querySelector('.single-event');
    //     //     $hiddenEvent.classList.add('hide'); 
    //     //     $hiddenEvent.id = `event-${dayNum}`;
    //     // }  
    // }
}

function constructActivity(dayEvent, day, marker, eventId, markerObj) {
    const $day = $dayActivities.querySelector(day); 

    const $fullDayActivities = $day.querySelector('.all-activities'); 

    const $dayActivity = $dayActivities.querySelector('[data-clone="single-event"]').cloneNode(true); //$day.querySelector('.single-event').cloneNode(true);   
    $dayActivity.removeAttribute('data-clone');
    $dayActivity.classList.remove('hide'); 
    $dayActivity.id = eventId;
    $dayActivity.querySelector('.remove-marker').classList.remove('hide'); 
    $dayActivity.querySelector('.get-directions').classList.remove('hide'); 
    // $dayActivity.querySelector('.day-text').textContent = dayEvent;
    $dayActivity.querySelector('.day-text').value = dayEvent;

    // console.log('markerObj.timeslot', markerObj.timeslot)

    const $timeOfDaySpan = $dayActivity.querySelector('.event-time-of-day'); 
    $timeOfDaySpan.timeslot = markerObj.timeslot || '';
    $timeOfDaySpan.starttime = markerObj.starttime || '';

    $timeOfDaySpan.value = markerObj.timeslot.toLowerCase();

    $dayActivity.marker = marker; 
    $dayActivity.markerObj = markerObj;
    $dayActivity.addEventListener('mouseover', e => {
        const $event = e.currentTarget; 
        // $event.setAttribute('title', $event.querySelector('.day-text').textContent);  
        $event.setAttribute('title', $event.querySelector('.day-text').value);  
    });

    // console.log('markerObj.timeOfDay', markerObj.timeOfDay, '\nmarkerObj', markerObj)

    $fullDayActivities.append($dayActivity); 
}

async function addDayToFirebase(userMail) {  
    const userData = doc(db, 'travelData', `user-${userMail}`);
    const docSnap = await getDoc(userData);
    const data = await docSnap.data(); 
    const { days } = data;

    const newDay = {
        summary: '',
        events: [
            {
                dayEventName: '',
                lat: '',
                lng: '',
                title: '',
                description: '',
                imageURL: '',
                KhonsuRecommends: true,
                timeslot: '',
                starttime: '',
                endtime: '',
                notes: '',
                reservation: '',
            }
        ]
    };

    days.push(newDay);

    const dayObj = {};
    dayObj.days = days; 
    dayObj.ModifiedAt = serverTimestamp(); 

    await updateDoc(userData, dayObj); 
}


$khonsuNotes.addEventListener('change', async e => {
    // if (!e.target.closest('.knotes')) return;

    // const userMail = localStorage.getItem('user-email'); 
    // if (!userMail) return; 

    // const $textarea = e.target;
    // const dayNum = $textarea.closest('.khonsu-notes').querySelector('.knotes-title').textContent.trim().split(/\s+/).pop();


    // const notes = e.target.value; 
    // updateKhonsuDataEdits(userMail, notes, dayNum); 
});

async function updateKhonsuDataEdits(userMail, notes, dayNum) {
    const existingMarkers = doc(db, 'Locations', `User-${userMail}`);
    const dayObj = {};
    const underscores = dayNum.toString().split('').map(_ => '_').join('');  
    dayObj[`${underscores}Day${dayNum}`] = notes; 
    dayObj.ModifiedAt = serverTimestamp(); 

    await updateDoc(existingMarkers, dayObj);
}


$reservations.addEventListener('change', async e => {
    const userMail = localStorage.getItem('user-email'); 
    if (!e.target.closest('.reserve') || !userMail) return; 

    const reservationData = [...$reservations.querySelectorAll('.reserve:not(.hide)')].map(r => {
        const time = r.querySelector('.reserve-time').value.trim();
        const info = r.querySelector('.reserve-info').value.trim();
        return `${time} - ${info}`; 
    });

    // updateReservationsEdits(userMail, reservationData); 
});


$addReservation.addEventListener('click', e => {
    const $reservations = e.currentTarget.closest('.reservations'); 
    const $reserve = $reservations.querySelector('.reserves .reserve');
    const $reserveClone = $reserve.cloneNode(true);
    $reserveClone.classList.remove('hide');

    $reserveClone.querySelector('.reserve-time').value = '';
    $reserveClone.querySelector('.reserve-info').value = '';

    flatpickr($reserveClone.querySelector('.reserve-time'), {
        enableTime: true,
        dateFormat: "Y-m-d H:i",
    });
    
    $reservations.querySelector('.reserves').append($reserveClone);
    // $reservations.insertBefore($reserveClone, $reservations.querySelector('.add-reservation')); 
});

$reservations.addEventListener('click', e => {
    const userMail = localStorage.getItem('user-email'); 
    if (!e.target.closest('.remove-reservation') || !userMail) return; 

    const $removeBtn = e.target; 
    $removeBtn.closest('.reserve').remove(); 
    // removeFirebaseReservations($removeBtn); 

    const reservationData = [...$reservations.querySelectorAll('.reserve:not(.hide)')].map(r => {
        const time = r.querySelector('.reserve-time').value;
        const info = r.querySelector('.reserve-info').value;
        return `${time} - ${info}`; 
    });
    
    // updateReservationsEdits(userMail, reservationData);
});

async function updateReservationsEdits(userMail, reservationData) {
    const existingMarkers = doc(db, 'Locations', `User-${userMail}`);
    const dayObj = {};
    dayObj['Reservations'] = reservationData; 
    dayObj.ModifiedAt = serverTimestamp(); 

    await updateDoc(existingMarkers, dayObj);
}

// function removeFirebaseReservations($removeBtn) {
//     const eventsArr = [...$dayEvent.closest('.all-activities').querySelectorAll('.single-event')].map(dayEvent => {
//         return dayEvent.markerObj;
//     });

//     const reservationData = [...$reservations.querySelectorAll('.reserve:not(.hide)')].map(r => {
//         const time = r.querySelector('.reserve-time').value;
//         const info = r.querySelector('.reserve-info').value;
//         return `${time} - ${info}`; 
//     });

//     const dayEventRef = doc(db, 'Locations', `User-${userMail}`);
//     const dayObj = {};
//     dayObj[`_Day${dayNum}`] = eventsArr; 
//     await updateDoc(dayEventRef, dayObj); 
// }


document.querySelectorAll('.khonsu-data .save-khonsu-data').forEach(btn => {
    btn.addEventListener('click', e => {
        const $btn = e.currentTarget; 
        const btnTxt = $btn.value; 
        $btn.value = 'Submitted!';
        setTimeout(()=>$btn.value=btnTxt,1000);
    });
});

async function updateKhonsuDataMapUrl(userMail, mapurl) {
    const existingMarkers = doc(db, 'Locations', `User-${userMail}`);
    const dayObj = {};
    dayObj['MapUrl'] = mapurl; 
    dayObj.ModifiedAt = serverTimestamp(); 

    await updateDoc(existingMarkers, dayObj);
    generateQRCode(mapurl, $qrCodeContainer); 
}

function generateQRCode(link, container) {
    const width = getComputedStyle(container).width;
    const height = getComputedStyle(container).height;
    const margin = 'auto'; 
    const bgColor = '#fff'; 

    const $qrCode = document.createElement('qr-code');
    $qrCode.id = 'qr1';
    $qrCode.setAttribute('contents', link);
    $qrCode.setAttribute('module-color', '#000');
    $qrCode.setAttribute('position-ring-color', '#f8942c');
    $qrCode.setAttribute('position-center-color', '#000');
    $qrCode.setAttribute('style', `width:${width};height:${height};margin:${margin};background-color:${bgColor};`);

    const $khonsuImg = document.createElement('img');
    // $khonsuImg.src = 'Imgs/khonsu-logo-white.png';
    $khonsuImg.src = 'https://uploads-ssl.webflow.com/61268cc8812ac5956bad13e4/6554ce372d94b4af034be736_FB%20App%20Logo%201024.png';
    $khonsuImg.setAttribute('slot', 'icon'); 
    $khonsuImg.setAttribute('width', '100%'); 
    $khonsuImg.setAttribute('height', '100%'); 

    $qrCode.append($khonsuImg);

    container.innerHTML = '';
    container.append($qrCode);
}

document.querySelector('.khonsu-data.map-url .map-url-link input').addEventListener('change', e => {
    const userMail = localStorage.getItem('user-email'); 
    if (!userMail) return; 
    const mapUrl = e.currentTarget.value; 
    updateKhonsuDataMapUrl(userMail, mapUrl); 
});


// function addOptionToDaysSelect(dayNum, headerText=`Day ${dayNum}`) {
function addOptionToDaysSelect(headerText) {
    const $option = document.createElement('option');
    // $option.setAttribute('value', `day-${dayNum}`);
    $option.setAttribute('value', headerText);
    $option.textContent = headerText; //`Day ${dayNum}`;  
    // $daysSelect.append($option); 
    $daysSelect.insertBefore($option, document.querySelector('.add-day-option'));
    $daysSelect.value = headerText; 
    return $option; 
}

// function addDayActivitiesListContainer(dayDate, headerText=`Day ${dayNum}`, parenDiv='.all-days') {
function addDayActivitiesListContainer(dayDate, parenDiv='.all-days') {
    const $dayEvent = $dayActivities.querySelector('[data-clone="day-event"]').cloneNode(true);
    
    $dayEvent.classList.remove('day-0-event');
    // $dayEvent.classList.add(`day-${dayNum}-event`);
    $dayEvent.setAttribute('day', dayDate);
    $dayEvent.querySelector('.day-head .header-text').textContent = dayDate; // headerText; //`Day ${dayNum}`; 
    // $dayEvent.setAttribute('day', headerText);

    if ($dayEvent.querySelector('.single-event.hide'))   {
        $dayEvent.querySelectorAll('.single-event:not(.hide)').forEach(el => el.remove()); 
        $dayEvent.querySelector('.single-event.hide').classList.remove('hide'); 
    }

    // $dayEvent.querySelector('.all-days').innerHTML = '';

    // $dayEvent.querySelectorAll('.map_list-icon').forEach(icon => icon.classList.add('hide')); 

    $dayEvent.querySelector('.remove-marker').classList.add('hide');
    $dayEvent.querySelector('.get-directions').classList.add('hide');
    
    $dayEvent.classList.remove('hide');  

    $dayEvent.querySelector('.single-event').classList.add('hide');

    const $parent = $dayActivities.querySelector(parenDiv);
    $parent.append($dayEvent);
    // $parent.insertBefore($dayEvent, $dayActivities.querySelector(`.day-${dayNum+1}-event`)); 

    if (!$parent.classList.contains('all-days')) return;
    $noDays.classList.add('hide');
}

function getCurrentDayNum() {
    let dayNum;
    if ($daysSelect.selectedIndex === 0 && $daysSelect.querySelectorAll('option').length === 2) {
        dayNum = 1;
    }
    else {
        dayNum = $daysSelect.selectedIndex;// + 1;
    }

    // const dayNum = $daysSelect.selectedIndex !== 0 ? $daysSelect.selectedIndex : $daysSelect.options.length - 1;  
    return dayNum; 
} 

$daysSelect.addEventListener('change', e => {
    const $select = e.currentTarget; 
    let index = $select.selectedIndex; 

    const addDay = $select.options[$select.options.length - 1].index;
    if (index === addDay) return;

    if (index !== 0) {
        hideAllDayEvents(); 

        const selectedDay = $select.value.trim();
        const $chosenDay = $dayActivities.querySelector(`.day-event[day='${selectedDay}']`);
        
        // const $chosenDay = document.querySelector(`.day-event.day-${index}-event`); 
        if ($chosenDay) {
            $chosenDay.classList.remove('hide'); 
            const $dayEvent = $chosenDay.closest('.day-event'); 
            if ($dayEvent.querySelector('.single-event').length === 1) {
                $dayEvent.querySelector('.single-event.hide')?.classList.remove('hide'); 
                $dayEvent.querySelector('.remove-marker')?.classList.add('hide');
                $dayEvent.querySelector('.get-directions')?.classList.add('hide');
            }
            showMarkers($chosenDay); 
        }
        else {
            const dayNum = index; 
            addDayActivitiesListContainer(selectedDay); 
        }
    }
    else {
        index = $select.options.length - 1; 
        $dayActivities.querySelector('.all-days').querySelectorAll('.day-event').forEach(day => day.classList.remove('hide')); 
        showAllMarkers(); 
    }
    currentDay = $select.options[ index ];   
});  

$daysSelect.addEventListener('change', e => {
    const $select = e.currentTarget; 
    const index = $select.selectedIndex; 
    const addDay = $select.options[$select.options.length - 1].index;
    if (index !== addDay) return;

    hideAllDayEvents(); 

    const dayNum = index; 
    let newDay = new Date($daysSelect.options[addDay-1].value);
    newDay = new Date(newDay.setDate( newDay.getDate() + 1 ))
                .toDateString();
    
    const day = newDay.substring(0, newDay.indexOf(' '));
    const rest = newDay.substring(day.length);
    const dayDate = `${day},${rest}`;

    addDayActivitiesListContainer(dayDate); 
    addOptionToDaysSelect(dayDate); 

    $select.selectedIndex = dayNum; 
});

function showAllMarkers() {
    $dayActivities.querySelectorAll('.day-event').forEach(day => showMarkers(day)); 
}

function showMarkers(day) {
    day.querySelectorAll('.single-event:not(.hide)').forEach(dayEvent => dayEvent.marker?.setMap(map));
}

function hideMarkers(day) {
    day.querySelectorAll('.single-event:not(.hide)').forEach(dayEvent => dayEvent.marker?.setMap(null));
}

function hideAllDayEvents() {
    $dayActivities.querySelector('.all-days').querySelectorAll('.day-event').forEach(day => {
        day.classList.add('hide'); 
        hideMarkers(day); 
    }); 
}

$dayActivities.addEventListener('click', e => {
    if (e.target.closest('.remove-marker')) {
        const $removeMarker = e.target; 
        const $singleEvent = $removeMarker.closest('.single-event'); 
        const $dayEvent = $removeMarker.closest('.day-event');
        const eventNum = $dayEvent.querySelectorAll('.single-event:not(.hide)').length; 
        const indexOfEditedEl = [...$singleEvent.closest('.all-activities').querySelectorAll('.single-event')].indexOf($singleEvent);
        
        removeMarker($singleEvent, $removeMarker, indexOfEditedEl); 
        if ($dayEvent.querySelectorAll('.single-event').length > 1) $singleEvent.remove(); 

        if (eventNum == 1) {
            $dayEvent.querySelector('.single-event.hide')?.classList.remove('hide'); 
            if ( Number( $dayEvent.querySelector('.day-head').textContent.trim().slice(-1) ) !== 1 ) {
                $dayEvent.classList.add('hide'); 
            }
        }
    }
    else if (e.target.closest('.remove-day')) {
        alertify.confirm('Remove Day?\nPlease confim',
            () => {
                // alertify.success('Ok');
                processDayRemoval();
            },
            () => {
                // alertify.error('Cancel');
        });

        function processDayRemoval() {
            const userMail = localStorage.getItem('user-email');  
            if (!userMail) {
                alertify.error('No user logged in sorry!'); 
                return; 
            }

            const $removeDay = e.target; 
            const $dayEvent = $removeDay.closest('.day-event');

            removeDay($dayEvent);
            

        } 
    }
    else if (e.target.closest('.get-directions')) {    
        const $getDir = e.target;   
        const $event = $getDir.closest('.single-event'); 
        const $day = $event.closest('.day-event');  

        const lat = $event.marker.position?.lat() || $event.marker.lat;
        const lng = $event.marker.position?.lng() || $event.marker.lng; 

        // const url = `${directionsUrlBase}&origin=${prevLat},${prevLng}&destination=${destinationLat},${destinationLng}`;  
        const url = `https://www.google.com/maps/place/${lat},${lng}`;
        window.open(url); 
    }
});  

function removeMarker($singleEvent, $removeMarker, indexOfEditedEl) {
    $singleEvent.marker?.setMap(null); 
    const dayNum = $removeMarker.closest('.day-event').querySelector('.day-head').textContent.trim().split(/\s+/).pop(); //.slice(-1); 
    const currentDayMarkers = $daysSelect.options[dayNum].markers;
    if (currentDayMarkers) currentDayMarkers.splice(currentDayMarkers.indexOf($singleEvent.marker), 1);   

    const userMail = localStorage.getItem('user-email');   
    if (userMail) removeFirebaseSavedMarker(userMail, dayNum, indexOfEditedEl);  
}  

async function removeDay($day) {
    const $daysParentDiv = $day.closest('.all-days'); 
    const dayNum = [...$daysParentDiv.children].indexOf($day) + 1;

    let currentDayMarkers = $daysSelect.options[dayNum]?.markers;
    if (currentDayMarkers) {
        currentDayMarkers.forEach(marker => {
            marker.setMap(null);
        });
        $daysSelect.options[dayNum].markers = [];  
    }

    $daysSelect.options[dayNum].remove();
    $day.remove(); 

    if ($daysParentDiv.children.length === 0) {
        $noDays.classList.remove('hide');
    }

    const userMail = localStorage.getItem('user-email');
    await removeFirebaseSavedDay(userMail, dayNum);

    if ($dayActivities.querySelector('.removed-days .all-days').children.length > 0) {
        $showRemoved.classList.remove('hide');
        $showRemoved.scrollIntoView({behavior: 'smooth', block: 'end', inline: 'nearest'});
    }
}

$showRemoved.addEventListener('click', e => {
    const $btn = e.currentTarget.querySelector('input[type=button]');
    $btn.classList.toggle('active');
    if ($btn.classList.contains('active')) {
        $btn.value = 'Hide removed days >>';
        $dayActivities.querySelector('.removed-days').classList.remove('hide');
    }
    else {
        $btn.value = 'Show removed days >>';
        $dayActivities.querySelector('.removed-days').classList.add('hide');
    }
}); 

async function removeFirebaseSavedDay(userMail, dayNum) {
    const userData = doc(db, 'travelData', `user-${userMail}`);
    const docSnap = await getDoc(userData);
    const data = await docSnap.data(); 
    const { days, deletedDays } = data;

    const dayArrIndex = dayNum-1;
    // let specificDay = days[dayArrIndex];

    const removedDay = days.splice(dayArrIndex, 1)[0];
    deletedDays.push(removedDay);
    // console.log('removedDay', removedDay)
    pushDayToRemovedDaysSection(removedDay, dayNum);

    // console.log('removedDay', removedDay)

    const dayObj = {};
    dayObj.days = days; 
    dayObj.deletedDays = deletedDays; 

    await updateDoc(userData, dayObj);  
}  

function pushDayToRemovedDaysSection(removedDay, dayNum) {
    const { dayDate, events } = removedDay;
    addDayActivitiesListContainer(dayDate, '.removed-days .all-days');

    events.forEach((dayActivity, eventNum) => {
        const { lat , lng, title='', dayEventName, timeslot, starttime, endtime } = dayActivity;
        if (lat && lng) {
            const locationInfo = {
                name: title,
                latLng: {lat, lng}
            };
            const createdMarker = createMarker(locationInfo);   
            // currentDay.markers.push(createdMarker);  
    
            const markerObj = { lat, lng, title, dayEventName, timeslot, starttime, endtime }; 
    
            postDayActivity(dayEventName, '.removed-days', createdMarker, `event${(eventNum+1)}-day${dayNum}`, markerObj); 
        }
    });
}

!async function createUserInFirebase(userMail) {
    const userRef = doc(db, 'travelData', `user-${userMail}`);
    const userSnap = await getDoc(userRef);
    if (userSnap.exists() || !userMail) return;
    await setDoc(userRef, { createdAt: serverTimestamp() }); 
}(localStorage.getItem('user-email')); 
 
// async function saveMarkerToFirebase(userMail, dayNum, dayDate, markerObj) { 
// async function saveMarkerToFirebase(userMail, dayDate, markerObj) {  
async function saveMarkerToFirebase(userMail, dayNum, dayDate, markerObj) {  
    const userData = doc(db, 'travelData', `user-${userMail}`);
    const docSnap = await getDoc(userData);
    const data = await docSnap.data(); 
    const { days } = data;

    // let dayArrIndex = $daysSelect.selectedIndex;
    // if ($daysSelect.selectedIndex === 0) {
    //     dayArrIndex = $daysSelect.options[$daysSelect.options.length - 2].index; 
    // }

    const dayArrIndex = dayNum-1;
    let specificDay = days[dayArrIndex];
    // let specificDay = days[dayArrIndex];

    if (!specificDay) {
        specificDay = {
            dayDate,
            summary: '',
            events: [], 
        };
        days.splice(dayArrIndex, 0, specificDay);
    }

    const dayEvents = specificDay.events;

    const { dayEventName='', lat=0, lng=0, title='', timeslot='', starttime='' } = markerObj; 
    const eventObj = {
        dayEventName,
        lat,
        lng,
        title,
        description: '',
        imageURL: '',
        KhonsuRecommends: true,
        timeslot,
        starttime,
        endtime: '',
        notes: '',
        reservation: '',
    };

    dayEvents.push(eventObj);

    const dayObj = {}; 
    dayObj.days = days; 
    dayObj.modifiedAt = serverTimestamp(); 

    // console.log('Saved to:', dayNum, 'days', days)  

    await updateDoc(userData, dayObj);
}

async function retrieveSavedMarkersFromFirebase(userMail) {    
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
    const { days } = data;

    console.log('days', days)

    const $allDays = $dayActivities.querySelector('.all-days'); 
    days.forEach(day => {
        const { dayDate, events:dayActivities } = day;
        const dayIdentifier = `[day="${dayDate.trim()}"]`;

        console.log('dayIdentifier', dayIdentifier)

        addDayActivitiesListContainer(dayDate);
        addOptionToDaysSelect(dayDate);

        dayActivities.forEach(activity => {
            const $currentDay = $allDays.querySelector(dayIdentifier);

            console.log('$currentDay', $currentDay)

            if (!$currentDay) return;

            const { dayEventName, lat, lng, title, timeslot, starttime, endtime } = activity;
            if (lat && lng) {
                const locationInfo = {
                    name: title,
                    latLng: {lat, lng}
                };
                const createdMarker = createMarker(locationInfo);   
                // currentDay.markers.push(createdMarker);  

                const markerObj = { lat, lng, title, dayEventName, timeslot, starttime, endtime }; 

                const eventId = dayDate.toLowerCase().replace(/,\s+|\s+/g,'-');
                postDayActivity(dayEventName, dayIdentifier, createdMarker, eventId, markerObj); 
            }
        });
    });

    $daysSelect.selectedIndex = 0; 
    if (days.length) resetAddressField(); 
}

/*
async function retrieveSavedMarkersFromFirebase(userMail) {    
    const docRef = doc(db, 'travelData', `user-${userMail}`);
    const docSnap = await getDoc(docRef);

    if (!docSnap.exists()) {
        // docSnap.data() will be undefined in this case
        console.log('No user with such email!');
        $noUser.textContent = 'No user with such email, sorry!';
        setTimeout(()=> $noUser.textContent = '', 5000);
        return; 
    }     

    const userData = docSnap.data();
    const { days, references } = userData;

    days.forEach((day, i) => {
        const dayNum = i + 1;
        const dayEvents = day.events;

        // currentDay = dayNum === 1 ? $daysSelect.options[1] : addOptionToDaysSelect(dayNum); 
        currentDay = getCurrentDayNum();
        currentDay.markers = currentDay.markers || []; 
        // $addDay.dayNum = dayNum;

        // console.log('Day::::', day)

        dayEvents.forEach((dayEvent, eventNum) => {
            const dayClass = `.day-${dayNum}-event`; 
            const $currentDay = $dayActivities.querySelector(dayClass); 

            const { lat, lng, title, dayEventName, timeslot, starttime, endtime } = dayEvent;
            if (lat && lng) {
                const locationInfo = {
                    name: title,
                    latLng: {lat, lng}
                };
                const createdMarker = createMarker(locationInfo);   
                currentDay.markers.push(createdMarker);  

                const markerObj = { lat, lng, title, dayEventName, timeslot, starttime, endtime }; 

                postDayActivity(dayEventName, dayClass, createdMarker, `event${(eventNum+2)}-day${dayNum}`, markerObj); 
            }

            if ($currentDay && $currentDay.querySelectorAll('.single-event').length > 1) $dayActivities.querySelector(`${dayClass} .single-event`).classList.add('hide'); 
        });

        const reservations = day.events.reservation;

        const kNotes = day.events.notes;
        setupKhonsuNotes(kNotes, dayNum);        
    });

    const { mapUrl } = references;
    setupMapurlNQRCode(mapUrl); 
} 
*/

function setupMapurlNQRCode(mapUrl) {
    $mapUrl.value = mapUrl; 
    generateQRCode(mapUrl, $qrCodeContainer); 
}

function setupKhonsuNotes(kNotes, dayNum) {
    if (dayNum == 1) { 
        const $notesTextarea = $khonsuNotes.querySelector('textarea.knotes');
        $notesTextarea.value = kNotes; 
    }
    else {
        const $notesDiv = $khonsuNotes.querySelector('.khonsu-notes').cloneNode(true);
        const $notesHeader = $notesDiv.querySelector('.knotes-title');
        const $notesTextarea = $notesDiv.querySelector('textarea.knotes');
        $notesHeader.textContent = `Khonsu Notes Day ${dayNum}`;
        $notesTextarea.value = kNotes; 
        $khonsuNotes.append($notesDiv);
    }
}



async function removeFirebaseSavedMarker(userMail, dayNum, indexOfEditedEl) {
    const userData = doc(db, 'travelData', `user-${userMail}`);
    const docSnap = await getDoc(userData);
    const data = await docSnap.data(); 
    const { days } = data;

    const dayArrIndex = dayNum-1;
    let specificDay = days[dayArrIndex];
    const dayEvents = specificDay.events;

    dayEvents.splice(indexOfEditedEl, 1); 
    const dayObj = {};
    dayObj.days = days; 

    await updateDoc(userData, dayObj);  
}  


$dayActivities.addEventListener('touchstart', e => {
    if (e.target.closest('.single-event')) {

        const $body = document.body;
        const $html = $body.parentElement; 

        // // $html.style.overflow = 'hidden';
        $body.style.overflow = 'hidden';

        // // $html.style.position = 'relative';
        $body.style.position = 'relative'; 

        // // $html.style.height = '100%';
        $body.style.height = '100%';

        // $html.style.touchAction = 'none';
        $body.style.touchAction = 'none';

        // $html.classList.add('stop-touch');
        // $body.classList.add('stop-touch');

        // $html.style.width = '100%';
        // $body.style.width = '100%';

        // document.body.style.touchAction = 'none';
    }
}); 

$dayActivities.addEventListener('touchmove', e => {
    if (e.target.closest('.single-event')) {
        const selectedItem = e.target.closest('.single-event'),
                list = selectedItem.parentNode,
                x = e.touches[0].clientX,
                y = e.touches[0].clientY;
        
        selectedItem.classList.add('drag-sort-active-mobile'); 
        let swapItem = document.elementFromPoint(x, y) === null ? selectedItem : document.elementFromPoint(x, y);
        
        if (list === swapItem.parentNode) {
            swapItem = swapItem !== selectedItem.nextSibling ? swapItem : swapItem.nextSibling;
            list.insertBefore(selectedItem, swapItem);
        }
    } 
});

$dayActivities.addEventListener('touchend', e => {
    if (e.target.closest('.single-event')) {
        const $dayEvent = e.target.closest('.single-event'); 
        $dayEvent.classList.remove('drag-sort-active-mobile');

        const $body = document.body;
        const $html = $body.parentElement; 

        // // $html.style.overflow = '';
        $body.style.overflow = '';

        // // $html.style.position = ''; 
        $body.style.position = ''; 

        // // $html.style.height = '';
        $body.style.height = '';

        // $html.style.touchAction = '';
        $body.style.touchAction = '';

        // $html.classList.remove('stop-touch');
        // $body.classList.remove('stop-touch');

        // $html.style.width = '';       
        // $html.style.width = '';


        // document.body.style.touchAction = '';

        updateFirebaseAfterSort($dayEvent);  
    }
}); 

$dayActivities.addEventListener('drag', e => {
    if (e.target.closest('.single-event')) {
        const selectedItem = e.target.closest('.single-event'),
                list = selectedItem.parentNode,
                x = e.clientX,
                y = e.clientY;
        
        selectedItem.classList.add('drag-sort-active');
        let swapItem = document.elementFromPoint(x, y) === null ? selectedItem : document.elementFromPoint(x, y);
        
        if (list === swapItem.parentNode) {
            swapItem = swapItem !== selectedItem.nextSibling ? swapItem : swapItem.nextSibling;
            list.insertBefore(selectedItem, swapItem);
        }
    } 
});

$dayActivities.addEventListener('dragend', e => {
    if (e.target.closest('.single-event')) {
        const $dayEvent = e.target.closest('.single-event'); 
        $dayEvent.classList.remove('drag-sort-active');

        // console.log('$dayEvent', $dayEvent)  

        updateFirebaseAfterSort($dayEvent);     
    }
});    

async function updateFirebaseAfterSort($dayEvent) {
    const dayNum = $dayEvent.id.slice(-1); 
    const userMail = localStorage.getItem('user-email');

    const dayEvents = [...$dayEvent.closest('.all-activities').querySelectorAll('.single-event')].map(dayEvent => {

        const { lat, lng, title, dayEventName, timeslot, starttime } = dayEvent.markerObj; 

        const eventObj = {
            dayEventName,
            lat,
            lng,
            title,
            description: '',
            imageURL: '',
            KhonsuRecommends: false,
            timeslot,
            starttime,
            endtime: '',
            notes: '',
            reservation: '',
        };

        return eventObj;
    });

    const userData = doc(db, 'travelData', `user-${userMail}`);
    const docSnap = await getDoc(userData);
    const data = await docSnap.data(); 
    const { days } = data;

    const dayArrIndex = dayNum-1;

    days[dayArrIndex].events = dayEvents;

    const dayObj = {}; 
    dayObj.days = days; 
    dayObj.modifiedAt = serverTimestamp(); 

    await updateDoc(userData, dayObj);
}

$dayActivities.addEventListener('click', e => {
    if (e.target.closest('.sort-events')) {
        const $dayEvent = e.target.closest('.day-event');
        const $allEvents = $dayEvent.querySelector('.all-activities'); 
        const $allEventsClone = $allEvents.cloneNode(true);

        const markerObjs = [...$allEvents.querySelectorAll('.single-event')].map(dayEvent => {
            return dayEvent.markerObj;
        });

        $allEventsClone.querySelectorAll('.single-event').forEach((dayEvent, i) => {
            dayEvent.markerObj = markerObjs[i]; 
        });

        const $modal = $dayEvent.querySelector('.modal');
        const $modalContent = $modal.querySelector('.modal-content');
        const $img = $modal.querySelector('.close-modal'); 

        $modalContent.append($allEventsClone);

        $img.addEventListener('click', e => {
            e.stopPropagation(); 
            const $closeBtn = e.currentTarget; 
            const $sortedEvents = $closeBtn.closest('.modal-content').querySelector('.all-activities');
            $allEvents.replaceWith($sortedEvents);
            $closeBtn.closest('.modal').classList.add('hide');  
        }); 

        $modal.addEventListener('click', e => { 
            if (e.target !== $modal) return;    
            const $sortedEvents = e.target.querySelector('.all-activities');
            $allEvents.replaceWith($sortedEvents);
            e.target.classList.add('hide'); 
        });

        $modal.classList.remove('hide');  
    }
});   

$dayActivities.addEventListener('change', async e => {
    if (!e.target.closest('.day-text') && !e.target.closest('.event-time-of-day')) return; 

    const userMail = localStorage.getItem('user-email');
    if (!userMail) return; 

    const $wrapper = e.target.closest('.single-event');
    const $time = $wrapper.querySelector('.event-time-of-day');
    const $dayText = $wrapper.querySelector('.day-text');
    const $header = $wrapper.closest('.day-event').querySelector('.day-head .header-text');
    const dayNum = $header.textContent.trim().split(/\s+/).pop();  

    if ($time && $time.classList.contains('time-exact')) {
        $wrapper.markerObj.starttime = $time.value;
    }
    else if ($time && !$time.classList.contains('time-exact')) {
        $wrapper.markerObj.timeslot = $time.value;
    }

    const indexOfEditedEl = [...$wrapper.parentElement.querySelectorAll('.single-event')].indexOf($wrapper);

    await updateFirebaseOnDayTextEdit(userMail, dayNum, $dayText, indexOfEditedEl); 
}); 

async function updateFirebaseOnDayTextEdit(userMail, dayNum, $dayText, indexOfEditedEl) {
    const userData = doc(db, 'travelData', `user-${userMail}`);
    const docSnap = await getDoc(userData);
    const data = await docSnap.data(); 
    const { days } = data;

    const dayArrIndex = dayNum-1;
    let specificDay = days[dayArrIndex];

    const dayEvents = specificDay.events;
    // const specificEvent = dayEvents[indexOfEditedEl];

    const $singleEvent = $dayText.closest('.single-event');

    const editedDayEventName = $singleEvent.querySelector('.day-text').value.trim();
    $singleEvent.markerObj.dayEventName = editedDayEventName; 

    const { lat, lng, title, dayEventName, timeslot, starttime } = $singleEvent.markerObj; 

    const eventObj = {
        dayEventName,
        lat,
        lng,
        title,
        description: '',
        imageURL: '',
        KhonsuRecommends: false,
        timeslot,
        starttime,
        endtime: '',
        notes: '',
        reservation: '',
    };

    dayEvents.splice(indexOfEditedEl, 0, eventObj);
    dayEvents.splice(indexOfEditedEl+1, 1); 

    const dayObj = {}; 
    dayObj.days = days; 
    dayObj.modifiedAt = serverTimestamp(); 

    await updateDoc(userData, dayObj);
}


$dayActivities.addEventListener('click', e => {
    if (!e.target.closest('.view-hourly')) return;  // event-exact-time-of-day

    const $hourlyBtn = e.target;
    const $dayEvent = $hourlyBtn.closest('.day-event'); 
    $dayEvent.querySelectorAll('.all-activities .single-event').forEach(dayEvent => {
        const timeSpan = dayEvent.querySelector('.event-time-of-day');
        const timeExact = dayEvent.querySelector('.event-exact-time-of-day'); 

        const timeslot = timeSpan.timeslot;
        const starttime = timeSpan.starttime;

        timeSpan.classList.toggle('hide');
        timeExact.classList.toggle('hide');

        timeSpan.value = timeslot;
        timeExact.value = starttime;
    });
}); 


const fp = flatpickr(document.querySelector('input.travel-date'), {
    mode: 'range',
    altInput: true,
    enableTime: false,
    altFormat: 'D M j',
    //altFormat: "h:i K D M j",
    //altFormat: "K D M j",
    dateFormat: 'Y-m-d',
    onChange: async (selectedDates, dateStr, instance) => {
        
    },
    onValueUpdate: async (selectedDates, dateStr, instance) => {
        await handleDatePickerChangeEvent(selectedDates); 

        if (!$allDays.innerHTML.trim()) return;
        resetAddressField();
        // currentDay = $allDays.children[ $allDays.children.length - 1 ];
        currentDay = $daysSelect.options[ $daysSelect.options.length - 2 ]; 
    }, 
});

async function handleDatePickerChangeEvent(selectedDates) {
    // $dayActivities.innerHTML = '';
    [...$dayActivities.querySelector('.all-days').children].forEach((c, i) => {
        if (i !== 0) c.remove();
    });

    const userMail = localStorage.getItem('user-email');

    const startDate = new Date(selectedDates[0]);
    const endDate = new Date(selectedDates[1]);
    // console.log('selectedDates', selectedDates)

    const numberOfDays = (endDate.getDate() - startDate.getDate()) + 1;
    let n = 0;

    const userData = doc(db, 'travelData', `user-${userMail}`);
    const docSnap = await getDoc(userData);
    const data = await docSnap.data(); 
    const { days } = data;

    for(let i = 0; i < numberOfDays; i++) {
        const startDateStr = startDate.toDateString();
        const day = startDateStr.substring(0, startDateStr.indexOf(' '));
        const rest = startDateStr.substring(day.length);
        const dayDate = `${day},${rest}`;

        const dayNum = i + 1;
        addDayActivitiesListContainer(dayDate);
        addOptionToDaysSelect(dayDate);
        console.log(`Day ${dayNum}`)

        // await saveMarkerToFirebase(userMail, dayNum);

        const dayToSave = {};
        dayToSave.summary = '';
        dayToSave.dayDate = dayDate;
        dayToSave.events = [];

        days.push(dayToSave); 

        startDate.setDate( startDate.getDate() + 1 ); 
    } 

    $daysSelect.selectedIndex = 0;

    const dayObj = {}; 
    dayObj.days = days; 
    dayObj.modifiedAt = serverTimestamp(); 

    await updateDoc(userData, dayObj);
} 



const fp2 = flatpickr(document.querySelector('[data-pick-date]'), {
    enableTime: true,
    dateFormat: "Y-m-d H:i",
    onChange: async (selectedDates, dateStr, instance) => {
        
    },
    onValueUpdate: async (selectedDates, dateStr, instance) => {
        
    }, 
});

function resetAddressField() {
    $address.removeAttribute('disabled');
    $address.setAttribute('placeholder', $addressPlaceholder);
}



window.onclick = function(e) {
    if (e.target == $mapResultsOverlay) {
        $mapResultsOverlay.classList.add('hide');
    }
}

$mapResultsContent.querySelector('.close').addEventListener('click', () => {
    $mapResultsOverlay.classList.add('hide');
});

$mapResultsContent.addEventListener('click', e => {
    if (!e.target.closest('.map-result')) return;

    const $mapResult = e.target.closest('.map-result');
    $mapResult.classList.toggle('active');
});