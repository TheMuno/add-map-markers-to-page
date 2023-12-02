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
    $daysSelect = document.querySelector('#days-select'), 
    $addDay = document.querySelector('.add-day'),
    $dayEvents = document.querySelector('.day-events'),
    $downloadUserCSV = document.querySelector('.download-user-csv'), 
    $downloadDBCSV = document.querySelector('.download-all-csv'),
    $printedPlanBtn = document.querySelector('.printed-plan'),
    $khonsuNotes = document.querySelector('.khonsu-notes .knotes'),
    $qrCodeContainer = document.querySelector('.khonsu-data.map-url-qrcode .map-url-qr');

    $userMail.value = localStorage.getItem('user-email') || 'one@mail.com'; 
    


// const $map = document.querySelector('.plan_map'),
//     $address = document.querySelector('#Activity-Name'),  
//     $daysSelect = document.querySelector('select#Day'), 
//     $addDay = document.querySelector('.add-day'),
//     $dayEvents = document.querySelector('.day-events'), 

const    $logoutBtn = document.querySelector('[data-wf-user-logout="Log out"]'), 
    mapZoom = 13,
    initialCoords  = { lat: 40.7580, lng: -73.9855 },
    mapIcon = 'https://uploads-ssl.webflow.com/61268cc8812ac5956bad13e4/64ba87cd2730a9c6cf7c0d5a_pin%20(3).png', 
    directionsUrlBase = 'https://www.google.com/maps/dir/?api=1', 
    startingIndex = 1,
    googleSpreadsheetID = '1Zj1ae5faA8h7UwHvtYVtKoiA_G3LtQcuTOFV1Evq4BQ';   

let currentDay = $daysSelect.options[startingIndex]; 
currentDay.markers = [];

$daysSelect.selectedIndex = startingIndex;  

google.maps.event.addDomListener(window, 'load', () => {
    const userMail = localStorage.getItem('user-email');  
    if (userMail) retrieveSavedMarkersFromFirebase(userMail);
}); 

$logoutBtn?.addEventListener('click', () => {
    localStorage.removeItem('user-email');
}); 

$printedPlanBtn.addEventListener('click', e => {
    window.open('./event-list.html')
});



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

        const numOfPlacesFound = places.length; 
        places.forEach((place) => {
            if (!place.geometry || !place.geometry.location) {
                alert('Sorry, try again\nNo cordinates found'); 
                return;
            }

            console.log('place', place)  

            const marker = createMarker(place);   

            map.panTo(marker.position); 

            currentDay.markers.push(marker);

            const dayNum = getCurrentDayNum(); 
            const day = `.day-${dayNum}-event`;    
            $dayEvents.querySelector(`${day} .single-event`)?.classList.add('hide');  

            const lat = marker.position.lat();
            const lng = marker.position.lng();
            const title = marker.title; 
 
            const markerObj = {lat, lng, title}; 

            $address.n = ($address.n || 1) + 1; 

            let idNum = 2; 
            const lastId = $dayEvents.querySelector(`${day} > .single-event:last-child:not(.hide)`)?.id;
            if (lastId) {
                let num = Number(lastId.split('-')[0].slice(-1));  
                num += 1;
                idNum = num; 
            }

            let dayEventName = ''; 
            if (numOfPlacesFound > 1) {
                const addressName = `${place.name} ${place.formatted_address}`; 
                dayEventName = addressName; 
                postDayEvent(addressName, day, marker, `event${idNum}-day${dayNum}`, {lat, lng, title, dayEventName});
            }
            else {
                dayEventName = $address.value; 
                postDayEvent($address.value, day, marker, `event${idNum}-day${dayNum}`, {lat, lng, title, dayEventName});
            }

            markerObj.dayEventName = dayEventName;             

            const userMail = localStorage.getItem('user-email');
            if (userMail) saveMarkerToFirebase(userMail, dayNum, markerObj);  

        });

        $address.value = '';  
    });
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


function postDayEvent(dayEvent, day, marker, eventId, markerObj) {
    const $day = $dayEvents.querySelector(day);  
    if ($day) {
        constructEvent(dayEvent, day, marker, eventId, markerObj); 
    }
    else {
        const dayNum = day.split('-')[1]; 
        addDayEventList(dayNum); 
        constructEvent(dayEvent, day, marker, eventId, markerObj); 

        if ($dayEvents.querySelector(`.day-${dayNum}-event`)) {
            const $hiddenEvent = $dayEvents.querySelector(`.day-${dayNum}-event`).querySelector('.single-event');
            $hiddenEvent.classList.add('hide'); 
            $hiddenEvent.id = `event-${dayNum}`;
        }  
    }
}

function constructEvent(dayEvent, day, marker, eventId, markerObj) {
    const $day = $dayEvents.querySelector(day); 

    const $allEvents = $day.querySelector('.all-events'); 

    const $dayEvent = $day.querySelector('.single-event').cloneNode(true);   
    $dayEvent.classList.remove('hide'); 
    $dayEvent.id = eventId;
    $dayEvent.querySelector('.remove-marker').classList.remove('hide'); 
    $dayEvent.querySelector('.get-directions').classList.remove('hide'); 
    $dayEvent.querySelector('.day-text').textContent = dayEvent;
    $dayEvent.marker = marker; 
    $dayEvent.markerObj = markerObj;
    $dayEvent.addEventListener('mouseover', e => {
        const $event = e.currentTarget; 
        $event.setAttribute('title', $event.querySelector('.day-text').textContent);  
    });

    $allEvents.append($dayEvent); 

    // $day.append($allEvents);   
}

$addDay.addEventListener('click', e => {
    const $addDayBtn = e.currentTarget;
    const dayNum = updateDayNum($addDayBtn); 
    currentDay = addOptionToDaysSelect(dayNum); 
    currentDay.markers = []; 
    $address.value = '';  

    $dayEvents.querySelectorAll('.day-event').forEach(day => day.classList.add('hide')); 

    addDayEventList(dayNum); 

    const userMail = localStorage.getItem('user-email'); 
    if (userMail) addDayToFirebase(userMail, dayNum); 
});
 
async function addDayToFirebase(userMail, dayNum) {  
    const existingMarkers = doc(db, 'Locations', `User-${userMail}`);
    const dayObj = {};
    const underscores = dayNum.toString().split('').map(_ => '_').join('');  
    dayObj[`${underscores}Day${dayNum}`] = [];  
    dayObj.ModifiedAt = serverTimestamp(); 

    await updateDoc(existingMarkers, dayObj); 
}





async function updateKhonsuDataEdits(userMail, notes) {
    const existingMarkers = doc(db, 'Locations', `User-${userMail}`);
    const dayObj = {};
    dayObj['KhonsuNotes'] = notes; 
    dayObj.ModifiedAt = serverTimestamp(); 

    await updateDoc(existingMarkers, dayObj);
}

$khonsuNotes.addEventListener('change', async e => {
    const userMail = localStorage.getItem('user-email'); 
    if (!userMail) return; 
    const notes = e.currentTarget.value; 
    updateKhonsuDataEdits(userMail, notes); 
});

async function updateReservationsEdits(userMail, reservationData) {
    const existingMarkers = doc(db, 'Locations', `User-${userMail}`);
    const dayObj = {};
    dayObj['Reservations'] = reservationData; 
    dayObj.ModifiedAt = serverTimestamp(); 

    await updateDoc(existingMarkers, dayObj);
}

const $reservations = document.querySelector('.reservations'); 
$reservations.addEventListener('change', async e => {
    const userMail = localStorage.getItem('user-email'); 
    if (!e.target.closest('.reserve') || !userMail) return; 

    const reservationData = [...$reservations.querySelectorAll('.reserve:not(.hide)')].map(r => {
        const time = r.querySelector('.reserve-time').value;
        const info = r.querySelector('.reserve-info').value;
        return `${time} - ${info}`; 
    });

    updateReservationsEdits(userMail, reservationData); 
});

document.querySelector('.add-reservation').addEventListener('click', e => {
    const $reservations = e.currentTarget.closest('.reservations'); 
    const $reserves = $reservations.querySelector('.reserves'); 
    const $reserve = $reserves.querySelector('.reserve');
    const $reserveClone = $reserve.cloneNode(true);
    $reserveClone.classList.remove('hide');
    $reservations.insertBefore($reserveClone, $reservations.querySelector('.add-reservation'));
});


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

    // <qr-code id="qr1" contents="https://www.google.com/" module-color="#1c7d43" position-ring-color="#13532d" position-center-color="#70c559">
    //     <img src="https://assets-global.website-files.com/61268cc8812ac5956bad13e4/6138485d84bf820d8e9ef952_khonsu%20logo%20white.svg" slot="icon" />
    // </qr-code>
}

document.querySelector('.khonsu-data.map-url .map-url-link input').addEventListener('change', e => {
    const userMail = localStorage.getItem('user-email'); 
    if (!userMail) return; 
    const mapUrl = e.currentTarget.value; 
    updateKhonsuDataMapUrl(userMail, mapUrl); 
});








function updateDayNum($addDayBtn) {
    const dayNum = ($addDayBtn.dayNum || 1) + 1;
    $addDayBtn.dayNum = dayNum;  
    return dayNum; 
} 

function addOptionToDaysSelect(dayNum) {
    const $option = document.createElement('option');
    $option.setAttribute('value', `day-${dayNum}`);
    $option.textContent = `Day ${dayNum}`;  
    $daysSelect.append($option); 
    $daysSelect.value = `day-${dayNum}`; 
    return $option; 
}

function addDayEventList(dayNum) {
    const $dayEvent = $dayEvents.children[0].cloneNode(true);
    $dayEvent.classList.remove('day-1-event');
    $dayEvent.classList.add(`day-${dayNum}-event`);
    $dayEvent.querySelector('.day-head').textContent = `Day ${dayNum}`; 

    if ($dayEvent.querySelector('.single-event.hide'))   {
        $dayEvent.querySelectorAll('.single-event:not(.hide)').forEach(el => el.remove()); 
        $dayEvent.querySelector('.single-event.hide').classList.remove('hide'); 
    }

    // $dayEvent.querySelectorAll('.map_list-icon').forEach(icon => icon.classList.add('hide')); 

    $dayEvent.querySelector('.remove-marker').classList.add('hide');
    $dayEvent.querySelector('.get-directions').classList.add('hide');
    
    $dayEvent.classList.remove('hide');   
    $dayEvents.insertBefore($dayEvent, $dayEvents.querySelector(`.day-${dayNum+1}-event`)); 
}

function getCurrentDayNum() {
    const dayNum = $daysSelect.selectedIndex !== 0 ? $daysSelect.selectedIndex : $daysSelect.options.length - 1;  
    return dayNum; 
} 

$daysSelect.addEventListener('change', e => {
    const $select = e.currentTarget; 
    let index = $select.selectedIndex; 
    if (index !== 0) {
        $dayEvents.querySelectorAll('.day-event').forEach(day => {
            day.classList.add('hide'); 
            hideMarkers(day); 
        }); 
        
        const $chosenDay = document.querySelector(`.day-event.day-${index}-event`); 
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
            addDayEventList(dayNum); 
        }
    }
    else {
        index = $select.options.length - 1; 
        $dayEvents.querySelectorAll('.day-event').forEach(day => day.classList.remove('hide')); 
        showAllMarkers(); 
    }
    currentDay = $select.options[ index ];   
});  

function showAllMarkers() {
    $dayEvents.querySelectorAll('.day-event').forEach(day => showMarkers(day)); 
}

function showMarkers(day) {
    day.querySelectorAll('.single-event:not(.hide)').forEach(dayEvent => dayEvent.marker?.setMap(map));
}

function hideMarkers(day) {
    day.querySelectorAll('.single-event:not(.hide)').forEach(dayEvent => dayEvent.marker?.setMap(null));
}

$dayEvents.addEventListener('click', e => {
    if (e.target.closest('.remove-marker')) {
        const $removeMarker = e.target; 
        const $event = $removeMarker.closest('.single-event'); 
        const $dayEvent = $removeMarker.closest('.day-event');
        const eventNum = $dayEvent.querySelectorAll('.single-event:not(.hide)').length; 
        
        removeMarker($event, $removeMarker); 
        if ($dayEvent.querySelectorAll('.single-event').length > 1) $event.remove(); 

        if (eventNum == 1) {
            $dayEvent.querySelector('.single-event.hide')?.classList.remove('hide'); 
            if ( Number( $dayEvent.querySelector('.day-head').textContent.slice(-1) ) !== 1 ) {
                $dayEvent.classList.add('hide'); 
            }
        }
    }
    else if (e.target.closest('.get-directions')) {    
        const $getDir = e.target;   
        const $event = $getDir.closest('.single-event'); 
        const $day = $event.closest('.day-event');  

        const prevLat = $event.previousElementSibling.marker?.position.lat();
        const prevLng = $event.previousElementSibling.marker?.position.lng();

        const destinationLat = $event.marker.position?.lat() || $event.marker.lat;
        const destinationLng = $event.marker.position?.lng() || $event.marker.lng; 

        if (prevLat && prevLng) {
            const url = `${directionsUrlBase}&origin=${prevLat},${prevLng}&destination=${destinationLat},${destinationLng}`;  
            window.open(url); 
        }
    }
});  

function removeMarker($event, $removeMarker) {
    $event.marker?.setMap(null); 
    const dayNum = $removeMarker.closest('.day-event').querySelector('.day-head').textContent.slice(-1); 
    const currentDayMarkers = $daysSelect.options[dayNum].markers;
    if (currentDayMarkers) currentDayMarkers.splice(currentDayMarkers.indexOf($event.marker), 1);   

    const userMail = localStorage.getItem('user-email');   
    if (userMail) removeFirebaseSavedMarker(userMail, dayNum, $event);  
}  

!async function createUserInFirebase(userMail) {
    const userRef = doc(db, 'Locations', `User-${userMail}`);
    const userSnap = await getDoc(userRef);
    if (userSnap.exists() || !userMail) return;
    await setDoc(userRef, { CreatedAt: serverTimestamp() }); 
}(localStorage.getItem('user-email')); 
 
async function saveMarkerToFirebase(userMail, dayNum, markerObj) {  
    const existingMarkers = doc(db, 'Locations', `User-${userMail}`);
    const dayObj = {};
    const underscores = dayNum.toString().split('').map(_ => '_').join('');  
    dayObj[`${underscores}Day${dayNum}`] = arrayUnion(markerObj); 
    dayObj.ModifiedAt = serverTimestamp(); 

    await updateDoc(existingMarkers, dayObj);
}

async function retrieveSavedMarkersFromFirebase(userMail) {
    const docRef = doc(db, 'Locations', `User-${userMail}`);
    const docSnap = await getDoc(docRef);

    if (!docSnap.exists()) {
        // docSnap.data() will be undefined in this case
        console.log('No user with such email!');

        const $warnDiv = document.createElement('div');
        $warnDiv.className = 'warn-info';
        $warnDiv.textContent = 'No user with such email!';

        $userMail.parentElement.insertBefore($warnDiv, $userMail.nextElementSibling);

        setTimeout(()=>$warnDiv.remove(),2000);

        return; 
    } 

    const userData = sortObject(docSnap.data());

    for (let [entry, locations] of Object.entries(userData)) { 
        // if (!day.startsWith('_')) continue;

        if (entry.startsWith('_')) {
            const day = entry; 

            const dayNum = Number(day.split('Day')[1]);  

            if (dayNum === 1) {
                currentDay = $daysSelect.options[1]; 
                currentDay.markers = currentDay.markers || []; 
                $addDay.dayNum = 1; 
            }
            else {  
                currentDay = addOptionToDaysSelect(dayNum);  
                currentDay.markers = currentDay.markers || []; 
                $addDay.dayNum = dayNum;
            }

            locations.forEach((location, eventNum) => {
                const dayClass = `.day-${dayNum}-event`; 
                const $currentDay = $dayEvents.querySelector(dayClass); 

                const { lat, lng, title, dayEventName } = location;
                if (lat && lng) {
                    const locationInfo = {
                        name: title,
                        latLng: {lat, lng}
                    };
                    const createdMarker = createMarker(locationInfo);   
                    currentDay.markers.push(createdMarker);  
                    postDayEvent(dayEventName, dayClass, createdMarker, `event${(eventNum+2)}-day${dayNum}`, {lat, lng, title, dayEventName}); 
                }

                if ($currentDay && $currentDay.querySelectorAll('.single-event').length > 1) $dayEvents.querySelector(`${dayClass} .single-event`).classList.add('hide');  
            });

        }
        else {
            if (entry.toLowerCase() === 'khonsunotes') {
                
                $khonsuNotes.value = locations.replaceAll('-','\n-').replace(/^\n/,''); 
            }
            else if (entry.toLowerCase() === 'reservations') {
                const $reservations = document.querySelector('.reservations'); 
                const $reservation = $reservations.querySelector('.reserve');
                locations.forEach(location => {
                    const $reservationClone = $reservation.cloneNode(true);
                    $reservationClone.classList.remove('hide');

                    const time = location.split('-')[0];
                    const info = location.split('-')[1];

                    $reservationClone.querySelector('.reserve-time').value = time;
                    $reservationClone.querySelector('.reserve-info').value = info; 

                    $reservations.querySelector('.reserves').append($reservationClone); 
                });
            }
            else if (entry.toLowerCase() === 'mapurl') {
                const $mapUrl = document.querySelector('.map-url-link input'); 
                locations = locations.trim(); 
                $mapUrl.value = locations; 
                generateQRCode(locations, $qrCodeContainer); 
            }
            // else if (entry.toLowerCase() === 'qrcode') {
                
            // }
        }

    }

    $daysSelect.selectedIndex = 0; 

    function sortObject(obj) {
        return Object.keys(obj).sort().reduce((result, key) => {   
            result[key] = obj[key];
            return result;
        }, {});
    }
}


async function removeFirebaseSavedMarker(userMail, dayNum, $event) {
    const dayEventRef = doc(db, 'Locations', `User-${userMail}`);
    const dayObj = {};
    dayObj[`_Day${dayNum}`] = arrayRemove($event.markerObj); 
    await updateDoc(dayEventRef, dayObj);  
}  


$dayEvents.addEventListener('touchstart', e => {
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

$dayEvents.addEventListener('touchmove', e => {
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

$dayEvents.addEventListener('touchend', e => {
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

$dayEvents.addEventListener('drag', e => {
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

$dayEvents.addEventListener('dragend', e => {
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

    const eventsArr = [...$dayEvent.closest('.all-events').querySelectorAll('.single-event')].map(dayEvent => {
        return dayEvent.markerObj;
    });

    const dayEventRef = doc(db, 'Locations', `User-${userMail}`);
    const dayObj = {};
    dayObj[`_Day${dayNum}`] = eventsArr; 
    await updateDoc(dayEventRef, dayObj); 
}

$dayEvents.addEventListener('click', e => {
    if (e.target.closest('.sort-events')) {
        const $dayEvent = e.target.closest('.day-event');
        const $allEvents = $dayEvent.querySelector('.all-events'); 
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
            const $sortedEvents = $closeBtn.closest('.modal-content').querySelector('.all-events');
            $allEvents.replaceWith($sortedEvents);
            $closeBtn.closest('.modal').classList.add('hide');  
        }); 

        $modal.addEventListener('click', e => { 
            if (e.target !== $modal) return;    
            const $sortedEvents = e.target.querySelector('.all-events');
            $allEvents.replaceWith($sortedEvents);
            e.target.classList.add('hide'); 
        });

        $modal.classList.remove('hide');  
    }
});   

$downloadUserCSV.addEventListener('click', async (e) => {
    const userMail = localStorage.getItem('user-email'); 
    if (!userMail) {
        alert('No User Email Found!'); 
        return;
    } 

    const $downloadBtn = e.currentTarget; 
    const downloadBtnTxt = $downloadBtn.value; 
    $downloadBtn.value = 'Loading...';

    const dayEvents = await getUserDayEvents(userMail);

    console.log(dayEvents)

    const csv = convertUserEventsToCSV(userMail, dayEvents);

    downloadBlob(csv, `${userMail}_Days-Events.csv`, 'text/csv;charset=utf-8;');

    $downloadBtn.value = downloadBtnTxt;

});

$downloadDBCSV.addEventListener('click', async (e) => {
    const userMail = localStorage.getItem('user-email'); 
    if (!userMail) {
        alert('No User Email Found!'); 
        return;
    } 

    const $downloadBtn = e.currentTarget; 
    const downloadBtnTxt = $downloadBtn.value; 
    $downloadBtn.value = 'Loading...';

    const allUsersEvents = await getAllUsersDayEvents();
    
    // console.log('All User Events Retrieved...') 

    // console.log(allUsersEvents)
    

    const csv = convertAllUsersEventsToCSV(allUsersEvents);

    downloadBlob(csv, `All-Users-Days-Events.csv`, 'text/csv;charset=utf-8;');

    $downloadBtn.value = downloadBtnTxt;
});

async function getAllUsersDayEvents() {
    const querySnapshot = await getDocs(collection(db, 'Locations')); 

    const allUsersEvents = {}; 

    querySnapshot.forEach(user => {
        // doc.data() is never undefined for query doc snapshots
        const email = user.id.split('User-')[1]; 

        const userData = user.data();
        const { CreatedAt, ModifiedAt } = userData; 

        const daysArr = [];
        for (const [key, val] of Object.entries(userData)) {
            if (key.startsWith('_')) {
                daysArr.push(val);  
            }
        }

        allUsersEvents[email] = daysArr; 
        if (CreatedAt) allUsersEvents[email].CreatedAt = CreatedAt;
        if (ModifiedAt) allUsersEvents[email].ModifiedAt = ModifiedAt;

    });  

    console.log('allUsersEvents', allUsersEvents)

    return allUsersEvents;  
}

function convertAllUsersEventsToCSV(allUsersEvents) {
    let str = getCSVHeaderStr();  

    for (const [userMail, dayEvents] of Object.entries(allUsersEvents)) {
        str += convertArrayToCSV(userMail, dayEvents); 
    }

    return str; 
}

async function getUserDayEvents(userMail) {
    const querySnapshot = await getDocs(collection(db, `Markers-${userMail}`));  
    const data = [];

    querySnapshot.forEach((doc) => { 
        data.push( doc.data().eventsArr );
    });

    return data; 
}

function convertUserEventsToCSV(userMail, dayEvents) {
    let str = getCSVHeaderStr();  
    str += convertArrayToCSV(userMail, dayEvents); 
    return str; 
}

function convertArrayToCSV(userMail, arr) {    
    const arrHasDays = arr.find(d => Array.isArray(d) && d.length);

    let createdAt = arr.CreatedAt ? new Date(arr.CreatedAt.toDate()).toUTCString() : ''; 
    let modifiedAt = arr.ModifiedAt ? new Date(arr.ModifiedAt.toDate()).toUTCString() : ''; 
    let str = ''; 

    if (!arrHasDays) {
        str += `${userMail},"${createdAt}","${modifiedAt}"\n`;   
        return str;
    }

    let userMailSet = false;
    let createdAtSet = false;
    let modifiedAtSet = false; 

    for (let i = 0, max = arr.length; i < max; i++) {
        const day = arr[i];
        const dayNum = i; 

        str += day.map(eventObj => {
            const { dayEventName='', title='', lat='', lng='' } = eventObj; 
            const row = `${!userMailSet ? userMail : ''},"${!createdAtSet ? createdAt : ''}","${!modifiedAtSet ? modifiedAt : ''}",${dayNum+1},"${dayEventName}","${title}",${lat},${lng}\n`; 
            if (!userMailSet) userMailSet = true; 
            if (!createdAtSet) createdAtSet = true; 
            if (!modifiedAtSet) modifiedAtSet = true; 
            return row;
        }).join(''); 

    }

    return str;
}

function getCSVHeaderStr() {
    return 'User Email,Created At,Modified At,Day,Day Event Name,Title,Latitude,Longitude\n'; 
}

function downloadBlob(content, filename, contentType) {
    // Create a blob
    var blob = new Blob([content], { type: contentType });
    var url = URL.createObjectURL(blob);
  
    // Create a link to download it
    var pom = document.createElement('a');
    pom.href = url;
    pom.setAttribute('download', filename);
    pom.click();
} 






/*
const SPREADSHEET_ID = '1Zj1ae5faA8h7UwHvtYVtKoiA_G3LtQcuTOFV1Evq4BQ'; 
const CLIENT_ID = '424207365074-g5444q1mhm5n5d04pu563ofqjup3j5e2.apps.googleusercontent.com'; 
const API_KEY = 'AIzaSyCMmi6kGAOGfMzK4CBvNiVBB7T6OjGbsU4'; 
const SCOPE = 'https://www.googleapis.com/auth/spreadsheets,https://www.googleapis.com/auth/drive,https://www.googleapis.com/auth/drive.file'; 

!function handleClientLoad() { //initialize the Google API
    gapi.load('client:auth2', initClient);
}();

function initClient() { //provide the authentication credentials you set up in the Google developer console
    console.log('gapi',gapi)  
   
    gapi.client.init({
      'apiKey': API_KEY,
      'clientId': CLIENT_ID,
      'scope': SCOPE,
      'discoveryDocs': ['https://sheets.googleapis.com/$discovery/rest?version=v4'],
    }).then(()=> {
      gapi.auth2.getAuthInstance().isSignedIn.listen(this.updateSignInStatus); //add a function called `updateSignInStatus` if you want to do something once a user is logged in with Google
      this.updateSignInStatus(gapi.auth2.getAuthInstance().isSignedIn.get());
    });
}

function onFormSubmit(submissionValues) {

    const params = {
      // The ID of the spreadsheet to update.
      spreadsheetId: SPREADSHEET_ID, 
      // The A1 notation of a range to search for a logical table of data.Values will be appended after the last row of the table.
      range: 'Sheet1', //this is the default spreadsheet name, so unless you've changed it, or are submitting to multiple sheets, you can leave this
      // How the input data should be interpreted.
      valueInputOption: 'RAW', //RAW = if no conversion or formatting of submitted data is needed. Otherwise USER_ENTERED
      // How the input data should be inserted.
      insertDataOption: 'INSERT_ROWS', //Choose OVERWRITE OR INSERT_ROWS
    };

    const valueRangeBody = {
      'majorDimension': 'ROWS', //log each entry as a new row (vs column)
      'values': [submissionValues] //convert the object's values to an array
    };

    let request = gapi.client.sheets.spreadsheets.values.append(params, valueRangeBody);
    request.then(function (response) {
      // TODO: Insert desired response behaviour on submission
      console.log(response.result);
    }, function (reason) {
      console.error('error: ' + reason.result.error.message);
    });
}

setTimeout(() => {
    console.log('ran!!')
    onFormSubmit('My, Name, Is, This'); 
}, 20 * 1000); 
// onFormSubmit('My, Name, Is, This') 


*/


  /**
   * Sample JavaScript code for sheets.spreadsheets.values.append
   * See instructions for running APIs Explorer code samples locally:
   * https://developers.google.com/explorer-help/code-samples#javascript
   */

  

{/* <button onclick="authenticate().then(loadClient)">authorize and load</button>
<button onclick="execute()">execute</button> */} 
