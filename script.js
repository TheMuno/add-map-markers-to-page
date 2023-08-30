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
});


const $map = document.querySelector('#map'),
    $userMail = document.querySelector('.user-email'), 
    $address = document.querySelector('.user-input'),
    $daysSelect = document.querySelector('#days-select'), 
    $addDay = document.querySelector('.add-day'),
    $dayEvents = document.querySelector('.day-events'),
    $printedPlanBtn = document.querySelector('.printed-plan');

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
    startingIndex = 1; 

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

            const marker = createMarker(place.name, place.geometry.location);  

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

function createMarker(title, position) {
    const marker = new google.maps.Marker({
        map,
        icon,
        title, 
        position,  
    });

    marker.addListener('click', () => { 
        markerPopup.close();
        markerPopup.setContent(marker.getTitle());
        markerPopup.open(marker.getMap(), marker);
    });

    return marker; 
} 


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
        return; 
    } 

    const userData = sortObject(docSnap.data());

    for (let [day, locations] of Object.entries(userData)) {
        if (!day.startsWith('_')) continue;

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
                const createdMarker = createMarker(title, {lat, lng});   
                currentDay.markers.push(createdMarker);  
                postDayEvent(dayEventName, dayClass, createdMarker, `event${(eventNum+2)}-day${dayNum}`, {lat, lng, title, dayEventName}); 
            }

            if ($currentDay && $currentDay.querySelectorAll('.single-event').length > 1) $dayEvents.querySelector(`${dayClass} .single-event`).classList.add('hide');  
        });

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

document.querySelector('.download-user-csv').addEventListener('click', async (e) => {
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

document.querySelector('.download-all-csv').addEventListener('click', async (e) => {
    const userMail = localStorage.getItem('user-email'); 
    if (!userMail) {
        alert('No User Email Found!'); 
        return;
    } 

    const $downloadBtn = e.currentTarget; 
    const downloadBtnTxt = $downloadBtn.value; 
    $downloadBtn.value = 'Loading...';

    const allUsersEvents = await getAllUsersDayEvents();
    
    // console.log(allUsersEvents)
    console.log('All User Events Retrieved...')

    const csv = convertAllUsersEventsToCSV(allUsersEvents);

    downloadBlob(csv, `All-Users-Days-Events.csv`, 'text/csv;charset=utf-8;');

    $downloadBtn.value = downloadBtnTxt;
});

async function getAllUsersDayEvents() {
    const docRef = doc(db, 'listOfCollections', 'users');
    const docSnap = await getDoc(docRef);

    console.log('DocSnap retrieved...')

    if (!docSnap.exists()) return; 
    console.log('Document data:', docSnap.data());

    const allUsersEvents = {}; 

    const listOfCollections = docSnap.data();
    const { userEmails } = listOfCollections;
    for (const userMail of userEmails) {
        const userEvents = await getUserDayEvents(userMail);

        console.log('User Mail Retrieved...')
        console.log('userMail', userMail)

        allUsersEvents[userMail] = userEvents;         
    }

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
    let userMailSet = false;
    let str = ''; 
    str += arr.map((day, dayNum) => {
        return day.map(eventObj => {
            const row = `${!userMailSet ? userMail : ''},${dayNum+1},"${eventObj.dayEventName}","${eventObj.title}",${eventObj.lat},${eventObj.lng}\n`; 
            if (!userMailSet) userMailSet = true; 
            return row;
        }).join(''); 
    }).join(''); 

    return str; 
}

function getCSVHeaderStr() {
    return 'User Email,Day,Day Event Name,Title,Latitude,Longitude\n'; 
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
