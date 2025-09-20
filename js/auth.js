/* DocSwap - Seamless Authentication Module */

class SeamlessAuth {
    constructor() {
        this.modal = null;
        this.isSignUp = false;
        this.isLoading = false;
        this.supabase = null;
        this.init();
    }

    async init() {
        // Wait for Supabase to be ready
        await this.waitForSupabase();
        this.setupModal();
        this.setupEventListeners();
        this.setupAuthStateListener();
        
        // Check if user is already authenticated
        const { data: { user } } = await this.supabase.auth.getUser();
        if (user) {
            // User is already authenticated, update UI
            this.handleAuthSuccess(user);
        } else {
            // User is not authenticated, show modal automatically
            this.openModal(false);
            // Disable background interaction until authentication
            this.disableUploadFunctionality();
        }
    }

    async waitForSupabase() {
        return new Promise((resolve) => {
            const checkSupabase = () => {
                if (window.supabase && typeof window.supabase.auth !== 'undefined') {
                    this.supabase = window.supabase;
                    console.log('✅ Supabase ready for auth');
                    console.log('🔍 Supabase client type:', typeof this.supabase);
                    console.log('🔍 Supabase auth available:', !!this.supabase.auth);
                    console.log('🔍 Supabase URL:', window.supabaseConfig?.SUPABASE_URL);
                    
                    // Test if this is real Supabase by checking for specific methods
                    if (this.supabase.auth.signInWithPassword && this.supabase.auth.signUp) {
                        console.log('✅ REAL Supabase client detected - authentication will work!');
                    } else {
                        console.warn('⚠️ Mock Supabase detected - authentication is simulated');
                    }
                    
                    resolve();
                } else {
                    setTimeout(checkSupabase, 100);
                }
            };
            checkSupabase();
        });
    }

    setupModal() {
        this.modal = document.getElementById('authModal');
        if (!this.modal) {
            console.error('Auth modal not found');
            return;
        }
    }

    setupEventListeners() {
        // Modal triggers
        document.querySelectorAll('[data-auth-trigger]').forEach(trigger => {
            trigger.addEventListener('click', (e) => {
                e.preventDefault();
                const action = trigger.dataset.authTrigger;
                this.openModal(action === 'signup');
            });
        });

        // Close modal (only if authenticated)
        const closeBtn = this.modal?.querySelector('.auth-close');
        const backdrop = this.modal?.querySelector('.auth-backdrop');
        
        closeBtn?.addEventListener('click', () => {
            // Only allow closing if user is authenticated
            if (this.supabase?.auth?.getUser && this.supabase.auth.getUser()) {
                this.closeModal();
            }
        });
        backdrop?.addEventListener('click', () => {
            // Only allow closing if user is authenticated
            if (this.supabase?.auth?.getUser && this.supabase.auth.getUser()) {
                this.closeModal();
            }
        });

        // Form submission
        const form = this.modal?.querySelector('#authForm');
        form?.addEventListener('submit', (e) => this.handleFormSubmit(e));

        // Email input for smart detection
        const emailInput = this.modal?.querySelector('#authEmail');
        emailInput?.addEventListener('input', (e) => this.handleEmailInput(e));



        // Google Sign-In
        const googleBtn = this.modal?.querySelector('#googleSignIn');
        googleBtn?.addEventListener('click', () => this.handleGoogleSignIn());

        // Tab functionality
        const tabs = this.modal?.querySelectorAll('.auth-tab');
        tabs?.forEach(tab => {
            tab.addEventListener('click', (e) => {
                e.preventDefault();
                const tabType = tab.dataset.tab;
                this.isSignUp = tabType === 'signup';
                this.updateModalContent();
                this.clearMessages();
            });
        });

        // Prevent ESC key from closing modal when not authenticated
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && this.modal?.classList.contains('active')) {
                // Only allow closing if user is authenticated
                if (this.supabase?.auth?.getUser && this.supabase.auth.getUser()) {
                    this.closeModal();
                }
                e.preventDefault();
            }
        });
    }

    setupAuthStateListener() {
        if (!this.supabase?.auth) return;

        this.supabase.auth.onAuthStateChange((event, session) => {
            console.log('Auth state changed:', event, session);
            
            if (event === 'SIGNED_IN' && session) {
                this.handleAuthSuccess(session.user);
            } else if (event === 'SIGNED_OUT') {
                this.handleSignOut();
            }
        });
    }

    openModal(isSignUp = false) {
        this.isSignUp = isSignUp;
        this.updateModalContent();
        this.modal?.classList.add('active');
        document.body.style.overflow = 'hidden';
        
        // Focus on email input
        setTimeout(() => {
            this.modal?.querySelector('#authEmail')?.focus();
        }, 300);
    }

    closeModal() {
        // Only allow closing if user is authenticated
        if (this.supabase?.auth?.getUser && this.supabase.auth.getUser()) {
            this.modal?.classList.remove('active');
            document.body.style.overflow = '';
            this.clearForm();
            this.clearMessages();
        }
    }

    toggleMode() {
        this.isSignUp = !this.isSignUp;
        this.updateModalContent();
        this.clearMessages();
    }

    updateModalContent() {
        const submitBtn = this.modal?.querySelector('#authSubmit');
        const signInTab = this.modal?.querySelector('[data-tab="signin"]');
        const signUpTab = this.modal?.querySelector('[data-tab="signup"]');
        const confirmPasswordGroup = this.modal?.querySelector('#confirmPasswordGroup');

        if (this.isSignUp) {
            submitBtn.textContent = 'Sign Up';
            signInTab?.classList.remove('active');
            signUpTab?.classList.add('active');
            confirmPasswordGroup.style.display = 'block';
        } else {
            submitBtn.textContent = 'Sign In';
            signUpTab?.classList.remove('active');
            signInTab?.classList.add('active');
            confirmPasswordGroup.style.display = 'none';
        }
    }

    async handleEmailInput(e) {
        const email = e.target.value.trim();
        const passwordField = this.modal?.querySelector('#authPassword');
        const passwordContainer = passwordField?.parentElement;

        if (email.length > 3 && email.includes('@')) {
            // Show password field with smooth animation
            passwordContainer?.classList.add('visible');
            
            // Smart detection: check if user exists
            if (email.length > 5 && this.isValidEmail(email)) {
                await this.detectUserMode(email);
            }
        } else {
            // Hide password field
            passwordContainer?.classList.remove('visible');
        }
    }

    async detectUserMode(email) {
        try {
            // This is a simplified detection - in real app, you'd check if user exists
            // For now, we'll just show the appropriate mode
            const indicator = this.modal?.querySelector('.auth-mode-indicator');
            if (indicator) {
                indicator.textContent = this.isSignUp ? 'New user detected' : 'Welcome back';
                indicator.style.opacity = '1';
                setTimeout(() => {
                    indicator.style.opacity = '0';
                }, 2000);
            }
        } catch (error) {
            console.log('User detection failed:', error);
        }
    }

    async handleFormSubmit(e) {
        e.preventDefault();
        
        if (this.isLoading) return;

        const email = this.modal?.querySelector('#authEmail')?.value.trim();
        const password = this.modal?.querySelector('#authPassword')?.value;

        if (!this.validateForm(email, password)) return;

        this.setLoading(true);

        try {
            if (this.isSignUp) {
                await this.signUp(email, password);
            } else {
                await this.signIn(email, password);
            }
        } catch (error) {
            this.showError(error.message);
        } finally {
            this.setLoading(false);
        }
    }

    async signIn(email, password) {
        console.log('🔐 Attempting sign in with:', email);
        
        const { data, error } = await this.supabase.auth.signInWithPassword({
            email,
            password
        });

        if (error) {
            console.error('❌ Sign in error:', error);
            throw error;
        }
        
        console.log('✅ Sign in successful:', data);
        this.showSuccess('🎉 Welcome back! Ready to convert some files?');
        setTimeout(() => this.closeModal(), 1500);
    }

    async signUp(email, password) {
        console.log('📝 Attempting sign up with:', email);
        
        const { data, error } = await this.supabase.auth.signUp({
            email,
            password
        });

        if (error) {
            console.error('❌ Sign up error:', error);
            throw error;
        }

        console.log('✅ Sign up response:', data);
        
        if (data.user && !data.session) {
            this.showSuccess('Check your email to confirm your account!');
        } else {
            this.showSuccess('Account created successfully!');
            setTimeout(() => this.closeModal(), 1000);
        }
    }

    async handleGoogleSignIn() {
        if (this.isLoading) return;
        
        this.setLoading(true);

        try {
            const { data, error } = await this.supabase.auth.signInWithOAuth({
                provider: 'google',
                options: {
                    redirectTo: window.location.origin
                }
            });

            if (error) throw error;
        } catch (error) {
            this.showError(error.message);
            this.setLoading(false);
        }
    }

    handleAuthSuccess(user) {
        console.log('User signed in:', user);
        this.showSuccess(`Welcome, ${user.email}!`);
        setTimeout(() => {
            this.forceCloseModal();
            this.updateUIForAuthenticatedUser(user);
        }, 1000);
    }

    forceCloseModal() {
        // Force close modal regardless of authentication state
        this.modal?.classList.remove('active');
        document.body.style.overflow = '';
        this.clearForm();
        this.clearMessages();
    }

    handleSignOut() {
        console.log('User signed out');
        this.updateUIForUnauthenticatedUser();
        
        // Automatically open login modal after logout
        setTimeout(() => {
            this.openModal(false); // Open in sign-in mode
        }, 500); // Small delay to ensure UI updates are complete
    }

    updateUIForAuthenticatedUser(user) {
        // Hide auth buttons
        const signInBtn = document.getElementById('sign-in-button');
        const signUpBtn = document.getElementById('sign-up-button');
        if (signInBtn) signInBtn.style.display = 'none';
        if (signUpBtn) signUpBtn.style.display = 'none';

        // Show user profile
        const userProfile = document.getElementById('user-profile');
        if (userProfile) {
            userProfile.classList.remove('hidden');
            
            // Set user avatar with first letter of email and dynamic styling
            const userAvatar = document.getElementById('user-avatar');
            const userEmail = document.getElementById('user-email');
            
            if (userAvatar && user.email) {
                const firstLetter = user.email.charAt(0).toUpperCase();
                userAvatar.textContent = firstLetter;
                userAvatar.title = user.email; // Tooltip with full email
                
                // Generate dynamic background color based on first letter
                const avatarColor = this.generateAvatarColor(firstLetter);
                userAvatar.style.backgroundColor = avatarColor.bg;
                userAvatar.style.borderColor = avatarColor.border;
                userAvatar.style.color = avatarColor.text;
                
                // Add subtle animation on update
                userAvatar.style.transform = 'scale(1.1)';
                setTimeout(() => {
                    userAvatar.style.transform = 'scale(1)';
                }, 200);
            }
            
            if (userEmail) {
                userEmail.textContent = user.email;
            }
        }

        // Setup logout functionality
        const logoutBtn = document.getElementById('logout-button');
        if (logoutBtn) {
            logoutBtn.onclick = () => this.signOut();
        }

        // Enable upload functionality
        this.enableUploadFunctionality();
    }

    updateUIForUnauthenticatedUser() {
        // Show auth buttons
        const signInBtn = document.getElementById('sign-in-button');
        const signUpBtn = document.getElementById('sign-up-button');
        if (signInBtn) signInBtn.style.display = 'inline-block';
        if (signUpBtn) signUpBtn.style.display = 'inline-block';

        // Hide user profile
        const userProfile = document.getElementById('user-profile');
        if (userProfile) {
            userProfile.classList.add('hidden');
        }

        // Disable upload functionality
        this.disableUploadFunctionality();
    }

    enableUploadFunctionality() {
        const uploadContainer = document.querySelector('.upload-container');
        
        if (uploadContainer) {
            uploadContainer.style.opacity = '1';
            uploadContainer.style.pointerEvents = 'auto';
            uploadContainer.classList.remove('disabled');
        }
    }

    disableUploadFunctionality() {
        const uploadContainer = document.querySelector('.upload-container');
        
        if (uploadContainer) {
            uploadContainer.style.opacity = '0.5';
            uploadContainer.style.pointerEvents = 'none';
            uploadContainer.classList.add('disabled');
        }
    }

    generateAvatarColor(letter) {
        // Define a set of beautiful, accessible color combinations
        const colorPalette = [
            { bg: '#6366f1', border: '#4f46e5', text: '#ffffff' }, // Indigo
            { bg: '#8b5cf6', border: '#7c3aed', text: '#ffffff' }, // Violet
            { bg: '#06b6d4', border: '#0891b2', text: '#ffffff' }, // Cyan
            { bg: '#10b981', border: '#059669', text: '#ffffff' }, // Emerald
            { bg: '#f59e0b', border: '#d97706', text: '#ffffff' }, // Amber
            { bg: '#ef4444', border: '#dc2626', text: '#ffffff' }, // Red
            { bg: '#ec4899', border: '#db2777', text: '#ffffff' }, // Pink
            { bg: '#84cc16', border: '#65a30d', text: '#ffffff' }, // Lime
            { bg: '#3b82f6', border: '#2563eb', text: '#ffffff' }, // Blue
            { bg: '#f97316', border: '#ea580c', text: '#ffffff' }, // Orange
            { bg: '#14b8a6', border: '#0d9488', text: '#ffffff' }, // Teal
            { bg: '#a855f7', border: '#9333ea', text: '#ffffff' }, // Purple
            { bg: '#22c55e', border: '#16a34a', text: '#ffffff' }, // Green
            { bg: '#eab308', border: '#ca8a04', text: '#ffffff' }, // Yellow
            { bg: '#64748b', border: '#475569', text: '#ffffff' }, // Slate
            { bg: '#dc2626', border: '#b91c1c', text: '#ffffff' }, // Red variant
            { bg: '#7c2d12', border: '#92400e', text: '#ffffff' }, // Brown
            { bg: '#1e40af', border: '#1d4ed8', text: '#ffffff' }, // Blue variant
            { bg: '#be123c', border: '#e11d48', text: '#ffffff' }, // Rose
            { bg: '#059669', border: '#047857', text: '#ffffff' }, // Emerald variant
            { bg: '#7c3aed', border: '#6d28d9', text: '#ffffff' }, // Violet variant
            { bg: '#0891b2', border: '#0e7490', text: '#ffffff' }, // Cyan variant
            { bg: '#ea580c', border: '#c2410c', text: '#ffffff' }, // Orange variant
            { bg: '#16a34a', border: '#15803d', text: '#ffffff' }, // Green variant
            { bg: '#9333ea', border: '#7e22ce', text: '#ffffff' }, // Purple variant
            { bg: '#0d9488', border: '#0f766e', text: '#ffffff' }  // Teal variant
        ];
        
        // Convert letter to a consistent index (A=0, B=1, etc.)
        const letterIndex = letter.charCodeAt(0) - 65; // A=65 in ASCII
        const colorIndex = letterIndex % colorPalette.length;
        
        return colorPalette[colorIndex];
    }

    validateForm(email, password) {
        if (!email || !this.isValidEmail(email)) {
            this.showError('Please enter a valid email address');
            return false;
        }

        if (!password || password.length < 6) {
            this.showError('Password must be at least 6 characters');
            return false;
        }

        // Check password confirmation for sign up
        if (this.isSignUp) {
            const confirmPassword = this.modal?.querySelector('#authConfirmPassword')?.value;
            if (!confirmPassword) {
                this.showError('Please confirm your password');
                return false;
            }
            if (password !== confirmPassword) {
                this.showError('Passwords do not match');
                return false;
            }
        }

        return true;
    }

    isValidEmail(email) {
        return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
    }

    setLoading(loading) {
        this.isLoading = loading;
        const submitBtn = this.modal?.querySelector('#authSubmit');
        const googleBtn = this.modal?.querySelector('#googleSignIn');
        const spinner = this.modal?.querySelector('.auth-loading');

        if (loading) {
            submitBtn?.classList.add('loading');
            googleBtn?.classList.add('loading');
            spinner?.classList.add('active');
        } else {
            submitBtn?.classList.remove('loading');
            googleBtn?.classList.remove('loading');
            spinner?.classList.remove('active');
        }
    }

    showError(message) {
        this.showMessage(message, 'error');
    }

    showSuccess(message) {
        this.showMessage(message, 'success');
    }

    showMessage(message, type) {
        const messageEl = this.modal?.querySelector('.auth-message');
        if (!messageEl) return;

        messageEl.textContent = message;
        messageEl.className = `auth-message ${type}`;
        messageEl.style.opacity = '1';

        // Auto-hide after 5 seconds
        setTimeout(() => {
            messageEl.style.opacity = '0';
        }, 5000);
    }

    clearMessages() {
        const messageEl = this.modal?.querySelector('.auth-message');
        if (messageEl) {
            messageEl.style.opacity = '0';
            messageEl.textContent = '';
        }
    }

    clearForm() {
        const form = this.modal?.querySelector('#authForm');
        if (form) {
            form.reset();
            // Hide password field
            const passwordContainer = this.modal?.querySelector('#authPassword')?.parentElement;
            passwordContainer?.classList.remove('visible');
        }
    }

    // Public method to sign out
    async signOut() {
        try {
            const { error } = await this.supabase.auth.signOut();
            if (error) throw error;
        } catch (error) {
            console.error('Sign out error:', error);
        }
    }
}

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    window.seamlessAuth = new SeamlessAuth();
});

// Export for global access
window.SeamlessAuth = SeamlessAuth;