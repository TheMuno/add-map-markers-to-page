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
    // $downloadUserCSV = document.querySelector('.download-user-csv'), 
    // $downloadDBCSV = document.querySelector('.download-all-csv'),
    // $printedPlanBtn = document.querySelector('.printed-plan'),
    $khonsuNotes = document.querySelector('.khonsu-notes .knotes'),
    $qrCodeContainer = document.querySelector('.khonsu-data.map-url-qrcode .map-url-qr'),
    $hourlyBtn = document.querySelector('.view-hourly'),
    $addReservation = document.querySelector('.add-reservation'),
    $reservations = document.querySelector('.reservations'),
    $hourEvents = document.querySelector('.hour-events'),
    $dayTimeSectionsSelect = document.querySelector('.day-time-sections'),
    $dayTimesSelect = document.querySelector('.day-times');
    
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
}//();

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
    // $dayEvent.querySelector('.day-text').textContent = dayEvent;
    $dayEvent.querySelector('.day-text').value = dayEvent;
    $dayEvent.marker = marker; 
    $dayEvent.markerObj = markerObj;
    $dayEvent.addEventListener('mouseover', e => {
        const $event = e.currentTarget; 
        // $event.setAttribute('title', $event.querySelector('.day-text').textContent);  
        $event.setAttribute('title', $event.querySelector('.day-text').value);  
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

$reservations.addEventListener('change', async e => {
    const userMail = localStorage.getItem('user-email'); 
    if (!e.target.closest('.reserve') || !userMail) return; 

    const reservationData = [...$reservations.querySelectorAll('.reserve:not(.hide)')].map(r => {
        const time = r.querySelector('.reserve-time').value.trim();
        const info = r.querySelector('.reserve-info').value.trim();
        return `${time} - ${info}`; 
    });

    updateReservationsEdits(userMail, reservationData); 
});


$addReservation.addEventListener('click', e => {
    const $reservations = e.currentTarget.closest('.reservations'); 
    const $reserves = $reservations.querySelector('.reserves'); 
    const $reserve = $reserves.querySelector('.reserve');
    const $reserveClone = $reserve.cloneNode(true);
    $reserveClone.classList.remove('hide');
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
    
    updateReservationsEdits(userMail, reservationData);
});

// function removeFirebaseReservations($removeBtn) {
//     const eventsArr = [...$dayEvent.closest('.all-events').querySelectorAll('.single-event')].map(dayEvent => {
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
    $dayEvent.querySelector('.day-head .header-text').textContent = `Day ${dayNum}`; 

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
            if ( Number( $dayEvent.querySelector('.day-head').textContent.trim().slice(-1) ) !== 1 ) {
                $dayEvent.classList.add('hide'); 
            }
        }
    }
    else if (e.target.closest('.remove-day')) {
        const $removeDay = e.target; 
        const $dayEvent = $removeDay.closest('.day-event');

        removeDay($dayEvent); 

        const dayNum = $dayEvent.querySelector('.day-head').textContent.trim().split(/\s+/).pop();  //.slice(-1); 
        if (dayNum === '1') {
            $dayEvent.querySelectorAll('.all-events .single-event:not(.hide)').forEach($event => $event.remove()); 
            $dayEvent.querySelector('.single-event.hide')?.classList.remove('hide'); 
            // $dayEvent.classList.add('hide'); 

            if ($dayEvents.querySelectorAll('.day-event').length !== 1) {
                $dayEvent.classList.add('hide'); 
            }
        }
        else {
            $dayEvent.remove();  

            if ($dayEvents.querySelectorAll('.day-event').length === 1) {
                $dayEvents.querySelector('.day-event.day-1-event').classList.remove('hide');
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
    const dayNum = $removeMarker.closest('.day-event').querySelector('.day-head').textContent.trim().split(/\s+/).pop(); //.slice(-1); 
    const currentDayMarkers = $daysSelect.options[dayNum].markers;
    if (currentDayMarkers) currentDayMarkers.splice(currentDayMarkers.indexOf($event.marker), 1);   

    const userMail = localStorage.getItem('user-email');   
    if (userMail) removeFirebaseSavedMarker(userMail, dayNum, $event);  
}  

function removeDay($day) {
    const dayNum = $day.querySelector('.day-head').textContent.trim().split(/\s+/).pop(); 

    let currentDayMarkers = $daysSelect.options[dayNum].markers;
    if (currentDayMarkers) {
        currentDayMarkers.forEach(marker => {
            marker.setMap(null);
        });
        currentDayMarkers = [];  
    }

    const userMail = localStorage.getItem('user-email');   
    if (userMail) removeFirebaseSavedDay(userMail, dayNum);
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

        setTimeout(()=>$warnDiv.remove(),5000);

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
                // const $reservations = document.querySelector('.reservations'); 
                const $reservation = $reservations.querySelector('.reserve');
                locations.forEach(location => {
                    const $reservationClone = $reservation.cloneNode(true);
                    $reservationClone.classList.remove('hide');

                    const time = location.split('-')[0]?.trim();
                    const info = location.split('-')[1]?.trim();

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

async function removeFirebaseSavedDay(userMail, dayNum) {
    const dayEventRef = doc(db, 'Locations', `User-${userMail}`);
    const dayObj = {};
    const underscores = dayNum.toString().split('').map(_ => '_').join('');  
    dayObj[`${underscores}Day${dayNum}`] = []; 

    console.log('dayObj', dayObj)

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

$dayEvents.addEventListener('change', async e => {
    const $dayText = e.target.closest('.day-text');
    if (!$dayText) return;

    const userMail = localStorage.getItem('user-email');
    if (!userMail) return; 
    
    const $header = $dayText.closest('.day-event').querySelector('.day-head .header-text');
    const dayNum = $header.textContent.trim().split(/\s+/).pop();  

    await updateFirebaseOnDayTextEdit(userMail, dayNum, $dayText); 
});

async function updateFirebaseOnDayTextEdit(userMail, dayNum, $dayText) {
    const existingMarkers = doc(db, 'Locations', `User-${userMail}`);
    let dayObj = {};
    const underscores = dayNum.toString().split('').map(_ => '_').join('');  

    const $allEvents = $dayText.closest('.all-events');
    const dayEvents = [...$allEvents.querySelectorAll('.single-event')].map(singleEvent => {
        const lat = singleEvent.markerObj?.lat; 
        const lng = singleEvent.markerObj?.lng; 
        const title = singleEvent.markerObj?.title; 

        const editedDayEventName = singleEvent.querySelector('.day-text').value.trim();
        singleEvent.markerObj.dayEventName = editedDayEventName; 

        return {lat, lng, title, dayEventName: editedDayEventName};
    });

    dayObj[`${underscores}Day${dayNum}`] = dayEvents;
    dayObj.ModifiedAt = serverTimestamp(); 

    await updateDoc(existingMarkers, dayObj); 

}

$hourlyBtn.addEventListener('click', e => {
    $dayEvents.classList.toggle('hide');
    $hourEvents.classList.toggle('hide');
    if ($dayEvents.classList.contains('hide')) {
        $hourlyBtn.value = 'View Days';
    }
    else {
        $hourlyBtn.value = 'View Hourly';
    }
}); 

$dayTimeSectionsSelect.addEventListener('change', e => {
    const $selectedTime = e.currentTarget.value.toLowerCase().trim();
    // const $hrEvents = $dayTimesSelect.closest('.hour-events '); 
    // const $otherTimes = $hrEvents.querySelectorAll(`.day-time:not(.${$selectedTime})`); 

    // $hrEvents.querySelector(`.${$selectedTime}`)?.classList.remove('hide');
    // $otherTimes.forEach(time => time.classList.add('hide'));

    if ($selectedTime.includes('morning')) {
        for (let i = 8; i < 12; i++) {
            createSelectOptions(i);
        } 
    }
    else if ($selectedTime.includes('afternoon')) { 
        createSelectOptions(12);
        for (let i = 1; i < 6; i++) {
            createSelectOptions(i);
        } 
    }
    else if ($selectedTime.includes('afternoon')) { 
        for (let i = 6; i < 12; i++) {
            createSelectOptions(i);
        } 
    }
});


function createSelectOptions(hr) {
    const $option = document.createElement('option');
    const time = `${hr} a.m`; 
    $option.value = time;
    $option.textContent = time; 
    $dayTimesSelect.append($option);
}

