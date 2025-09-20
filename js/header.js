// DocSwap - Header Functionality

document.addEventListener('DOMContentLoaded', function() {
    // Get user profile elements
    const userProfile = document.getElementById('user-profile');
    const userAvatar = document.getElementById('user-avatar');
    const userEmail = document.getElementById('user-email');
    const logoutButton = document.getElementById('logout-button');
    
    // Function to update user avatar with initials
    function updateUserAvatar() {
        if (userAvatar && userEmail) {
            const email = userEmail.textContent;
            if (email) {
                // Get first letter of email as initial
                const initial = email.charAt(0).toUpperCase();
                userAvatar.textContent = initial;
            }
        }
    }
    
    // Toggle email visibility when clicking on avatar
    if (userAvatar) {
        userAvatar.addEventListener('click', function(e) {
            e.stopPropagation(); // Prevent event bubbling
            
            // Toggle email visibility
            if (userEmail.style.display === 'block') {
                userEmail.style.display = 'none';
            } else {
                userEmail.style.display = 'block';
            }
        });
    }
    
    // Hide email when clicking outside
    document.addEventListener('click', function() {
        if (userEmail) {
            userEmail.style.display = 'none';
        }
    });
    
    // Prevent hiding when clicking on the email itself
    if (userEmail) {
        userEmail.addEventListener('click', function(e) {
            e.stopPropagation();
        });
    }
    
    // Initialize avatar when page loads
    updateUserAvatar();
    
    // Update avatar when user logs in (to be called from auth.js)
    window.updateUserUI = function(email) {
        if (userEmail) {
            userEmail.textContent = email;
        }
        // Use setTimeout to ensure DOM is updated before setting avatar
        setTimeout(() => {
            updateUserAvatar();
        }, 10);
    };
});