/* === Imports === */
import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";
import { getAuth,
         createUserWithEmailAndPassword,
         signInWithEmailAndPassword,
         signOut,
         onAuthStateChanged, 
         GoogleAuthProvider,
         signInWithPopup } from "firebase/auth"
import { getFirestore,
         collection,
         addDoc,
         serverTimestamp,
         onSnapshot,
         query,
         where,
         orderBy,
         doc,
         updateDoc,
         deleteDoc } from "firebase/firestore"
import { getStorage } from "firebase/storage";
/* === Firebase Setup === */
/* IMPORTANT: Replace this with your own firebaseConfig when doing challenges */
const firebaseConfig = {
    apiKey: "AIzaSyC_qk8zhJbnWzZGjeSOdm_gihUtqFM8B94",
    authDomain: "moodlyo.firebaseapp.com",
    projectId: "moodlyo",
    storageBucket: "moodlyo.appspot.com",
    messagingSenderId: "723871384214",
    appId: "1:723871384214:web:5a182dd43de3979517b8b7",
    measurementId: "G-R10JG0F74F"
}

const app = initializeApp(firebaseConfig)
const auth = getAuth(app)
const provider = new GoogleAuthProvider()
const db = getFirestore(app)
const analytics = getAnalytics(app);
const storage = getStorage(app)
/* === UI === */

/* == UI - Elements == */

const viewLoggedOut = document.getElementById("logged-out-view")
const viewLoggedIn = document.getElementById("logged-in-view")

const signInWithGoogleButtonEl = document.getElementById("sign-in-with-google-btn")

const emailInputEl = document.getElementById("email-input")
const passwordInputEl = document.getElementById("password-input")
const userNameEl = document.getElementById("username-input").value
const userDisplayName = userNameEl

const signInButtonEl = document.getElementById("sign-in-btn")
const createAccountButtonEl = document.getElementById("create-account-btn")

const signOutButtonEl = document.getElementById("sign-out-btn")
const settingsButtonEl = document.getElementById("settings-btn")

const userProfilePictureEl = document.getElementById("user-profile-picture")
const userGreetingEl = document.getElementById("user-greeting")

const moodEmojiEls = document.getElementsByClassName("mood-emoji-btn")
const textareaEl = document.getElementById("post-input")
const postButtonEl = document.getElementById("post-btn")

const allFilterButtonEl = document.getElementById("all-filter-btn")

const filterButtonEls = document.getElementsByClassName("filter-btn")

const postsEl = document.getElementById("posts")


/* == UI - Event Listeners == */

signInWithGoogleButtonEl.addEventListener("click", authSignInWithGoogle)

signInButtonEl.addEventListener("click", authSignInWithEmail)
createAccountButtonEl.addEventListener("click", authCreateAccountWithEmail)

signOutButtonEl.addEventListener("click", authSignOut)

for (let moodEmojiEl of moodEmojiEls) {
    moodEmojiEl.addEventListener("click", selectMood)
}

for (let filterButtonEl of filterButtonEls) {
    filterButtonEl.addEventListener("click", selectFilter)
}

postButtonEl.addEventListener("click", postButtonPressed)

/* === State === */

let moodState = 0

/* === Global Constants === */

const collectionName = "posts"

/* === Main Code === */

onAuthStateChanged(auth, (user) => {
    if (user) {
        showLoggedInView()
        
        showProfilePicture(userProfilePictureEl, user)
        showUserGreeting(userGreetingEl, user)
        updateFilterButtonStyle(allFilterButtonEl)
        fetchAllPosts(user)
    } else {
        showLoggedOutView()
    }
})

/* === Functions === */

/* = Functions - Firebase - Authentication = */

function authSignInWithGoogle() {
    signInWithPopup(auth, provider)
        .then((result) => {
            console.log("Signed in with Google")
        }).catch((error) => {
            console.error(error.message)
        })
}

function authSignInWithEmail() {
    const email = emailInputEl.value
    const password = passwordInputEl.value
    
    signInWithEmailAndPassword(auth, email, password)
        .then((userCredential) => {
            clearAuthFields()
        })
        .catch((error) => {
            console.error(error.message)
        })
}

function authCreateAccountWithEmail() {
    const email = emailInputEl.value
    const password = passwordInputEl.value

    createUserWithEmailAndPassword(auth, email, password)
        .then((userCredential) => {
            clearAuthFields()
        })
        .catch((error) => {
            console.error(error.message) 
        })
}

function authSignOut() {
    signOut(auth)
        .then(() => {
        }).catch((error) => {
            console.error(error.message)
        })
}

/* = Functions - Firebase - Cloud Firestore = */

async function addPostToDB(postBody, user) {
    try {
        const docRef = await addDoc(collection(db, collectionName), {
            body: postBody,
            uid: user.uid,
            createdAt: serverTimestamp(),
            mood: moodState
        })
        console.log("Document written with ID: ", docRef.id)
    } catch (error) {
        console.error(error.message)
    }
}

async function updatePostInDB(docId, newBody) {
    const postRef = doc(db, collectionName, docId);

    await updateDoc(postRef, {
        body: newBody
    })
}

async function deletePostFromDB(docId) {
    await deleteDoc(doc(db, collectionName, docId))
}

function fetchInRealtimeAndRenderPostsFromDB(query, user) {
    onSnapshot(query, (querySnapshot) => {
        clearAll(postsEl)
        
        querySnapshot.forEach((doc) => {
            renderPost(postsEl, doc)
        })
    })
}

function fetchTodayPosts(user) {
    const startOfDay = new Date()
    startOfDay.setHours(0, 0, 0, 0)
    
    const endOfDay = new Date()
    endOfDay.setHours(23, 59, 59, 999)
    
    const postsRef = collection(db, collectionName)
    
    const q = query(postsRef, where("uid", "==", user.uid),
                              where("createdAt", ">=", startOfDay),
                              where("createdAt", "<=", endOfDay),
                              orderBy("createdAt", "desc"))
                              
    fetchInRealtimeAndRenderPostsFromDB(q, user)                  
}

function fetchWeekPosts(user) {
    const startOfWeek = new Date()
    startOfWeek.setHours(0, 0, 0, 0)
    
    if (startOfWeek.getDay() === 0) { // If today is Sunday
        startOfWeek.setDate(startOfWeek.getDate() - 6) // Go to previous Monday
    } else {
        startOfWeek.setDate(startOfWeek.getDate() - startOfWeek.getDay() + 1)
    }
    
    const endOfDay = new Date()
    endOfDay.setHours(23, 59, 59, 999)
    
    const postsRef = collection(db, collectionName)
    
    const q = query(postsRef, where("uid", "==", user.uid),
                              where("createdAt", ">=", startOfWeek),
                              where("createdAt", "<=", endOfDay),
                              orderBy("createdAt", "desc"))
                              
    fetchInRealtimeAndRenderPostsFromDB(q, user)
}

function fetchMonthPosts(user) {
    const startOfMonth = new Date()
    startOfMonth.setHours(0, 0, 0, 0)
    startOfMonth.setDate(1)

    const endOfDay = new Date()
    endOfDay.setHours(23, 59, 59, 999)

	const postsRef = collection(db, collectionName)
    
    const q = query(postsRef, where("uid", "==", user.uid),
                              where("createdAt", ">=", startOfMonth),
                              where("createdAt", "<=", endOfDay),
                              orderBy("createdAt", "desc"))

    fetchInRealtimeAndRenderPostsFromDB(q, user)
}

function fetchAllPosts(user) {
    const postsRef = collection(db, collectionName)
    
    const q = query(postsRef, where("uid", "==", user.uid),
                              orderBy("createdAt", "desc"))

    fetchInRealtimeAndRenderPostsFromDB(q, user)
}

/* == Functions - UI Functions == */

function createPostHeader(postData) {
    /*
        <div class="header">
        </div>
    */
    const headerDiv = document.createElement("div")
    headerDiv.className = "header"
    
        /* 
            <h3>21 Sep 2023 - 14:35</h3>
        */
        const headerDate = document.createElement("h3")
        headerDate.textContent = displayDate(postData.createdAt)
        headerDiv.appendChild(headerDate)
        
        /* 
            <img src="assets/emojis/5.png">
        */
        const moodImage = document.createElement("img")
        moodImage.src = `assets/emojis/${postData.mood}.png`
        headerDiv.appendChild(moodImage)
        
    return headerDiv
}

function createPostBody(postData) {
    /*
        <p>This is a post</p>
    */
    const postBody = document.createElement("p")
    postBody.innerHTML = replaceNewlinesWithBrTags(postData.body)
    
    return postBody
}

function createPostUpdateButton(wholeDoc) {
    const postId = wholeDoc.id
    const postData = wholeDoc.data()
    
    /* 
        <button class="edit-color">Edit</button>
    */
    const button = document.createElement("button")
    button.textContent = "Edit"
    button.classList.add("edit-color")
    button.addEventListener("click", function() {
        const newBody = prompt("Edit the post", postData.body)
        
        if (newBody) {
            updatePostInDB(postId, newBody)
        }
    })
    
    return button
}

function createPostDeleteButton(wholeDoc) {
    const postId = wholeDoc.id
    
    /* 
        <button class="delete-color">Delete</button>
    */
    const button = document.createElement('button')
    button.textContent = 'Delete'
    button.classList.add("delete-color")
    button.addEventListener('click', function() {
        deletePostFromDB(postId)
    })
    return button
}

function createPostFooter(wholeDoc) {
    /* 
        <div class="footer">
            <button>Edit</button>
            <button>Delete</button>
        </div>
    */
    const footerDiv = document.createElement("div")
    footerDiv.className = "footer"
    
    footerDiv.appendChild(createPostUpdateButton(wholeDoc))
    footerDiv.appendChild(createPostDeleteButton(wholeDoc))
    
    return footerDiv
}

function renderPost(postsEl, wholeDoc) {
    const postData = wholeDoc.data()
    
    const postDiv = document.createElement("div")
    postDiv.className = "post"
    
    postDiv.appendChild(createPostHeader(postData))
    postDiv.appendChild(createPostBody(postData))
    postDiv.appendChild(createPostFooter(wholeDoc))
    
    postsEl.appendChild(postDiv)
}

function replaceNewlinesWithBrTags(inputString) {
    return inputString.replace(/\n/g, "<br>")
}

function postButtonPressed() {
    const postBody = textareaEl.value
    const user = auth.currentUser
    
    if (postBody && moodState) {
        addPostToDB(postBody, user)
        clearInputField(textareaEl)
        resetAllMoodElements(moodEmojiEls)
    }
}

function clearAll(element) {
    element.innerHTML = ""
}

function showLoggedOutView() {
    hideView(viewLoggedIn)
    showView(viewLoggedOut)
}

function showLoggedInView() {
    hideView(viewLoggedOut)
    showView(viewLoggedIn)
}

function showView(view) {
    view.style.display = "flex" 
}

function hideView(view) {
    view.style.display = "none"
}

function clearInputField(field) {
	field.value = ""
}

function clearAuthFields() {
	clearInputField(emailInputEl)
	clearInputField(passwordInputEl)
}

function showProfilePicture(imgElement, user) {
    // Get references to HTML elements
    const fileInput = document.getElementById('file-input');
    const userProfilePicture = document.getElementById('user-profile-picture');
    const profilePictureContainer = document.querySelector('.profile-picture-container');
  
    // Add an event listener to the file input element
    fileInput.addEventListener('change', function(event) {
      // Get the selected file
      const file = event.target.files[0];
  
      // Create a FileReader object
      const reader = new FileReader();
  
      // Set the callback function for when the file is loaded
      reader.onload = function(event) {
        // Set the source of the image element to the loaded file
        userProfilePicture.src = event.target.result;
  
        // Save the image data to localStorage
        localStorage.setItem('profilePicture', event.target.result);
      };
  
      // Read the file as a data URL
      reader.readAsDataURL(file);
    });
  
    // Check if there is a saved profile picture in localStorage
    const savedProfilePicture = localStorage.getItem('profilePicture');
    if (savedProfilePicture) {
      // Set the source of the image element to the saved profile picture
      userProfilePicture.src = savedProfilePicture;
    }
  }
  
  

function showUserGreeting(element, user) {
    const currentDate = new Date();
    const currentHour = currentDate.getHours();
    let userDisplayName = localStorage.getItem("userDisplayName"); // Retrieve the user's input from local storage
    let greeting;
    let motivationalQuote;

    // Define your motivational quotes for each time of day
    const morningQuotes = [
        "Rise up, start fresh, see the bright opportunity in each new day.",
        "The morning sun has a way of turning your worries into shadows.",
        "Every morning brings new potential, but if you dwell on the misfortunes of the day before, you tend to overlook tremendous opportunities.",
        "Embrace the day with enthusiasm, for greatness awaits, hidden in the moments you're yet to live.",
        "Your journey to success begins with the first step out of bed, a reminder that each day is a fresh canvas to paint your aspirations.",
        "Chase your dreams relentlessly, for they are worth the pursuit, and in the chase, you'll discover your true self.",
        "The morning sun is a reminder that you can rise after any fall, just as nature renews itself, so can you.",
        "Believe in yourself, for that's where your true power lies, and self-belief can move mountains.",
        "Make today amazing by setting positive intentions, as intention shapes reality, make it a masterpiece.",
        "You are stronger than you think, and today will prove it, showing you the depth of your resilience.",
        "Don't wait for opportunities, create them each morning, as the architect of your life, design your path.",
        "Hard work in the morning paves the way for a brighter future, investing your effort is like planting the seeds of your success."

    ];

    const afternoonQuotes = [
        "Seize the afternoon with purpose, for it's another chance to make today remarkable.",
        "In the middle of the day, find your strength, for you've come this far; you can go further.",
        "Afternoon is a canvas awaiting your creativity; paint it with your accomplishments.",
        "Just as the sun stands high in the sky, let your aspirations reach their peak in the afternoon.",
        "Believe in your ability to conquer the challenges of the day, for the afternoon is your proving ground.",
        "As you tackle the tasks of the afternoon, remember that perseverance is the key to progress.",
        "Afternoon is the bridge between morning and evening, make it a bridge to success.",
        "Embrace the challenges of the afternoon, for they are the stepping stones to your goals.",
        "In the afternoon, productivity is your best friend, and determination is your guide.",
        "As the sun begins its descent, let your achievements rise in the afternoon's light.",
        "Success is not final, failure is not fatal: it is the courage to continue that counts. - Winston Churchill",
        "The only way to do great work is to love what you do. - Steve Jobs",
        "The afternoon knows what the morning never suspected. - Swedish Proverb"
    ];

    const eveningQuotes = [
        "The evening's the best part of the day. You've done your day's work. Now you can put your feet up and enjoy it. - Kazuo Ishiguro",
        "Don't watch the clock; do what it does. Keep going. - Sam Levenson",
        "Evenings are the beautifully sweet spot between the harsh light of the day and the dead darkness of night.",
        "As the sun sets on the day, reflect on your accomplishments and be proud of your progress.",
        "Evening is a time to unwind, but also a time to plan for a better tomorrow.",
        "In the quiet of the evening, find the strength to finish what you started in the morning.",
        "The evening is a reminder that even the darkest hours can't stop the light from returning.",
        "Embrace the peace of the evening and let it rejuvenate your spirit for what lies ahead.",
        "As day turns to night, remember that each evening is an opportunity for personal growth.",
        "Your evening is a treasure chest of dreams; open it and set new goals for the future.",
        "In the calm of the evening, find clarity and purpose for the days to come.",
        "The evening sky is painted with dreams; it's time to make them a reality.",
        "As the stars appear in the evening sky, let your aspirations shine brightly in your heart."
    ];

    // Function to select a random quote from an array
    function getRandomQuote(quotesArray) {
        const randomIndex = Math.floor(Math.random() * quotesArray.length);
        return quotesArray[randomIndex];
    }

    if (user.displayName) {
        const userFirstName = user.displayName.split(" ")[0];
        greeting = `Hello, ${userFirstName}! `;
    } else if (userDisplayName) {
        const userFirstName = userDisplayName.split(" ")[0];
        greeting = `Hello, ${userFirstName}! `;
    } else {
        greeting = "Hello, friend! ";
    }

    if (currentHour >= 5 && currentHour < 12) {
        greeting += "Good morning!";
        motivationalQuote = getRandomQuote(morningQuotes);
    } else if (currentHour >= 12 && currentHour < 17) {
        greeting += "Good afternoon!";
        motivationalQuote = getRandomQuote(afternoonQuotes);
    } else {
        greeting += "Good evening!";
        motivationalQuote = getRandomQuote(eveningQuotes);
    }
    
    // Combine the greeting and motivational quote
    const combinedMessage = `${greeting} How are you feeling today?<br><div class="quote">${motivationalQuote}</div>`;
    element.innerHTML = combinedMessage;


    // Reduce font size of motivation
    const quoteElement = element.querySelector('.quote');
    quoteElement.style.fontSize = 'smaller';
}

// Save the user's input to local storage
document.getElementById("username-input").addEventListener("input", function() {
    const userDisplayName = this.value;
    localStorage.setItem("userDisplayName", userDisplayName);
});




function displayDate(firebaseDate) {
    if (!firebaseDate) {
        return "Date processing"
    }
    
    const date = firebaseDate.toDate()
    
    const day = date.getDate()
    const year = date.getFullYear()
    
    const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"]
    const month = monthNames[date.getMonth()]

    let hours = date.getHours()
    let minutes = date.getMinutes()
    hours = hours < 10 ? "0" + hours : hours
    minutes = minutes < 10 ? "0" + minutes : minutes

    return `${day} ${month} ${year} - ${hours}:${minutes}`
}

/* = Functions - UI Functions - Mood = */

function selectMood(event) {
    const selectedMoodEmojiElementId = event.currentTarget.id
    
    changeMoodsStyleAfterSelection(selectedMoodEmojiElementId, moodEmojiEls)
    
    const chosenMoodValue = returnMoodValueFromElementId(selectedMoodEmojiElementId)
    
    moodState = chosenMoodValue
}

function changeMoodsStyleAfterSelection(selectedMoodElementId, allMoodElements) {
    for (let moodEmojiEl of moodEmojiEls) {
        if (selectedMoodElementId === moodEmojiEl.id) {
            moodEmojiEl.classList.remove("unselected-emoji")          
            moodEmojiEl.classList.add("selected-emoji")
        } else {
            moodEmojiEl.classList.remove("selected-emoji")
            moodEmojiEl.classList.add("unselected-emoji")
        }
    }
}

function resetAllMoodElements(allMoodElements) {
    for (let moodEmojiEl of allMoodElements) {
        moodEmojiEl.classList.remove("selected-emoji")
        moodEmojiEl.classList.remove("unselected-emoji")
    }
    
    moodState = 0
}

function returnMoodValueFromElementId(elementId) {
    return Number(elementId.slice(5))
}

/* == Functions - UI Functions - Date Filters == */

function resetAllFilterButtons(allFilterButtons) {
    for (let filterButtonEl of allFilterButtons) {
        filterButtonEl.classList.remove("selected-filter")
    }
}

function updateFilterButtonStyle(element) {
    element.classList.add("selected-filter")
}

function fetchPostsFromPeriod(period, user) {
    if (period === "today") {
        fetchTodayPosts(user)
    } else if (period === "week") {
        fetchWeekPosts(user)
    } else if (period === "month") {
        fetchMonthPosts(user)
    } else {
        fetchAllPosts(user)
    }
}

function selectFilter(event) {
    const user = auth.currentUser
    
    const selectedFilterElementId = event.target.id
    
    const selectedFilterPeriod = selectedFilterElementId.split("-")[0]
    
    const selectedFilterElement = document.getElementById(selectedFilterElementId)
    
    resetAllFilterButtons(filterButtonEls)
    
    updateFilterButtonStyle(selectedFilterElement)
    
    fetchPostsFromPeriod(selectedFilterPeriod, user)
}


// Get references to HTML elements


anime.timeline({loop: true})
  .add({
    targets: '.ml5 .line',
    opacity: [0.5,1],
    scaleX: [0, 1],
    easing: "easeInOutExpo",
    duration: 700
  }).add({
    targets: '.ml5 .line',
    duration: 600,
    easing: "easeOutExpo",
    translateY: (el, i) => (-0.625 + 0.625*2*i) + "em"
  }).add({
    targets: '.ml5 .ampersand',
    opacity: [0,1],
    scaleY: [0.5, 1],
    easing: "easeOutExpo",
    duration: 600,
    offset: '-=600'
  }).add({
    targets: '.ml5 .letters-left',
    opacity: [0,1],
    translateX: ["0.5em", 0],
    easing: "easeOutExpo",
    duration: 600,
    offset: '-=300'
  }).add({
    targets: '.ml5 .letters-right',
    opacity: [0,1],
    translateX: ["-0.5em", 0],
    easing: "easeOutExpo",
    duration: 600,
    offset: '-=600'
  }).add({
    targets: '.ml5',
    opacity: 0,
    duration: 1000,
    easing: "easeOutExpo",
    delay: 1000
  });


//   User Profile Picture
// Get a reference to the image element you want to update
const imageElement = document.querySelector("user-profile-picture"); // Update this selector as needed

// Add an event listener to the file input element
fileInput.addEventListener("change", (event) => {
    const file = event.target.files[0];

    // Create a storage reference to the root of your Firebase Storage
    const storageRef = firebase.storage().ref();

    // Create a reference to the file you want to upload
    const imageRef = storageRef.child("images/" + file.name);

    // Upload the file to Firebase Storage
    const uploadTask = imageRef.put(file);

    // Listen for the state changes, like progress, error, and completion
    uploadTask.on(
        "state_changed",
        (snapshot) => {
            // Handle progress, if needed
            const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
            console.log(`Upload is ${progress}% done`);
        },
        (error) => {
            // Handle errors, if any
            console.error("Error uploading image: ", error);
        },
        () => {
            // When the upload is complete, get the download URL
            uploadTask.snapshot.ref.getDownloadURL().then((downloadURL) => {
                // Update the image source with the download URL
                imageElement.src = downloadURL;
            });
        }
    );
});

// Side panel button for settings 

const audioPlayer = document.getElementById("background-audio");
const playButton = document.getElementById("play-button");
const pauseButton = document.getElementById("pause-button");
const volumeSlider = document.getElementById("volume-slider");

playButton.addEventListener("click", function() {
    audioPlayer.play();
});

pauseButton.addEventListener("click", function() {
    audioPlayer.pause();
});

volumeSlider.addEventListener("input", function() {
    audioPlayer.volume = volumeSlider.value;
});

