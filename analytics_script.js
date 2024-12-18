import { initializeApp } from "https://www.gstatic.com/firebasejs/10.1.0/firebase-app.js";
import { getFirestore, doc, setDoc, getDoc, 
    getDocs, updateDoc, deleteField, collection,
    arrayUnion, arrayRemove, serverTimestamp,
    query, where } from "https://www.gstatic.com/firebasejs/10.1.0/firebase-firestore.js";

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

const $promptCounter = document.querySelector('.counter.prompts'); 
const $errorCounter = document.querySelector('.counter.errors');
const $errorPercent = document.querySelector('.counter.error-percent');

!async function retrievePromptsFromDB() {
    const docRef = doc(db, 'travelData', 'user_ids');
    const docSnap = await getDoc(docRef);

    if (!docSnap.exists()) {
        // docSnap.data() will be undefined in this case
        console.log('No such field "user_ids"!');
        return; 
    } 

    const { id_array:userIds } = docSnap.data();

    let totalPrompts = 0,
        totalErrors = 0,
        percent = 0;

    let errorArr = [];

    const $errorsTable = document.querySelector('.tbody');
    const $cloneRow = $errorsTable.querySelector('.trow.hide');

    for (const id of userIds) {
        const { prompts, promptErrors } = await fetchUserIDPrompt(id);

        if (prompts) totalPrompts += prompts.length; 
        if (!promptErrors) continue;
            
        totalErrors += promptErrors.length;

        console.log('promptErrors', promptErrors)

        promptErrors.forEach(err => {
            setupRow(err);
        });        
    }

    percent = ((totalErrors/totalPrompts) * 100).toFixed(2);

    $promptCounter.textContent = totalPrompts;
    $errorCounter.textContent = totalErrors;
    $errorPercent.textContent = `${percent}%`;

    function setupRow({errorMsg, prompt}) {
        const $row = $cloneRow.cloneNode(true);
        $row.classList.remove('hide');
        $row.querySelector('.tcell.errors').textContent = errorMsg;
        $row.querySelector('.tcell.prompts').textContent = prompt;
        $errorsTable.append($row);
    }
}();

async function fetchUserIDPrompt(id) {
    const docRef = doc(db, 'travelData', id);
    const docSnap = await getDoc(docRef);
    if (!docSnap.exists()) return;
    const idData = docSnap.data();
    const { prompts, promptErrors } = idData;

    // const promptsNum = prompts ? prompts.length : 0; 
    // const errorsNum = promptErrors ? promptErrors.length : 0;

    // return { promptsNum, errorsNum };
    
    return { prompts, promptErrors };
}   

