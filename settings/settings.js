// Initialize Firebase with your updated Firebase config
const firebaseConfig = {
    apiKey: "AIzaSyC_qk8zhJbnWzZGjeSOdm_gihUtqFM8B94",
    authDomain: "moodlyo.firebaseapp.com",
    projectId: "moodlyo",
    storageBucket: "moodlyo.appspot.com",
    messagingSenderId: "723871384214",
    appId: "1:723871384214:web:5a182dd43de3979517b8b7",
    measurementId: "G-R10JG0F74F"
};

firebase.initializeApp(firebaseConfig);

// Get references to HTML elements
const fileInput = document.getElementById('file-input');
const profileImage = document.getElementById('profile-image');
const profileImageForm = document.getElementById('profile-image-form');
const sidePanel = document.querySelector('.side-panel');
const togglePanelBtn = document.getElementById('toggle-panel-btn');
const body = document.body;

// Add an event listener to the button to toggle the side panel
togglePanelBtn.addEventListener('click', () => {
    sidePanel.classList.toggle('side-panel-open');
    body.classList.toggle('body-open');
});

// Add an event listener to the form for image upload
profileImageForm.addEventListener('submit', (e) => {
    e.preventDefault();

    const file = fileInput.files[0];

    if (file) {
        // Create a Firebase Storage reference to store the image
        const storageRef = firebase.storage().ref('profile_images/' + file.name);

        // Upload the image to Firebase Storage
        const uploadTask = storageRef.put(file);

        // Monitor the upload progress
        uploadTask.on('state_changed',
            (snapshot) => {
                // Handle progress (e.g., update a progress bar)
            },
            (error) => {
                console.error('Error uploading image:', error);
            },
            () => {
                // Image successfully uploaded, update the user's profile with the image URL
                uploadTask.snapshot.ref.getDownloadURL().then((downloadURL) => {
                    // Update the user's profile with the downloadURL using Firebase Authentication's updateProfile method
                    const user = firebase.auth().currentUser;
                    user.updateProfile({
                        photoURL: downloadURL
                    }).then(() => {
                        // Update the displayed profile image
                        profileImage.src = downloadURL;
                    }).catch((error) => {
                        console.error('Error updating user profile:', error);
                    });
                });
            }
        );
    }
});
