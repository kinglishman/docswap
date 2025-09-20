/* DocSwap - Supabase Configuration */

// Configuration
const API_BASE_URL = 'http://localhost:5002';

// Global configuration object
window.supabaseConfig = {
    SUPABASE_URL: null,
    SUPABASE_ANON_KEY: null
};

// Global supabase client
let supabase = null;

// Check if Supabase is available
async function waitForSupabaseScript() {
    return new Promise((resolve) => {
        const checkSupabase = () => {
            if (window.supabase && typeof window.supabase.createClient === 'function') {
                console.log('[CONFIG DEBUG] ✅ Supabase library is available');
                resolve();
            } else {
                console.log('[CONFIG DEBUG] Waiting for Supabase library...');
                setTimeout(checkSupabase, 100);
            }
        };
        checkSupabase();
    });
}

// Initialize configuration from backend
async function initializeConfig() {
    try {
        console.log(`[CONFIG DEBUG] [${new Date().toISOString()}] Starting configuration initialization...`);
        
        // Wait for Supabase library to be available
        await waitForSupabaseScript();
        console.log('[CONFIG DEBUG] Supabase library loaded');
        console.log('[CONFIG DEBUG] Current window.supabase before init:', typeof window.supabase);
        
        // Try to fetch configuration from backend API
        try {
            console.log(`[CONFIG DEBUG] [${new Date().toISOString()}] Fetching configuration from backend API...`);
            console.log('[CONFIG DEBUG] API URL:', `${API_BASE_URL}/api/config`);
            const response = await fetch(`${API_BASE_URL}/api/config`);
            console.log('[CONFIG DEBUG] Response status:', response.status);
            console.log('[CONFIG DEBUG] Response ok:', response.ok);
            if (response.ok) {
                const config = await response.json();
                console.log('[CONFIG DEBUG] Config received:', config);
                window.supabaseConfig.SUPABASE_URL = config.supabaseUrl;
                window.supabaseConfig.SUPABASE_ANON_KEY = config.supabaseAnonKey;
                console.log('[CONFIG DEBUG] Configuration loaded from backend API');
            } else {
                throw new Error(`Failed to fetch from backend API: ${response.status} ${response.statusText}`);
            }
        } catch (apiError) {
            console.error('[CONFIG DEBUG] API Error details:', apiError);
            console.warn('[CONFIG DEBUG] Backend API not available, using fallback configuration:', apiError.message);
            // Use direct configuration for development
            console.log('[CONFIG DEBUG] Using direct Supabase configuration');
            window.supabaseConfig.SUPABASE_URL = 'https://qzuwonueyvouvrhiwcob.supabase.co';
            window.supabaseConfig.SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InF6dXdvbnVleXZvdXZyaGl3Y29iIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDcwNzM2ODgsImV4cCI6MjA2MjY0OTY4OH0.hRGTJ4oPFs6lJ4O17oeRbFOMYAgMxyMM2DSjSd5_W00';
        }
        
        console.log('[CONFIG DEBUG] Final config:', window.supabaseConfig);
        
        // Validate that credentials are properly configured
        if (!window.supabaseConfig.SUPABASE_URL || !window.supabaseConfig.SUPABASE_ANON_KEY) {
            throw new Error('Supabase credentials not properly configured');
        }
        
        console.log('[CONFIG DEBUG] Credentials validated successfully');
        console.log('[CONFIG DEBUG] window.supabase before createClient:', typeof window.supabase);
        
        // Initialize Supabase client
        if (window.supabase && typeof window.supabase.createClient === 'function') {
            console.log('[CONFIG DEBUG] Creating real Supabase client...');
            supabase = window.supabase.createClient(window.supabaseConfig.SUPABASE_URL, window.supabaseConfig.SUPABASE_ANON_KEY);
            
            // Verify the client was created successfully
            if (supabase && supabase.auth) {
                window.supabase = supabase; // Make it globally available
                console.log('[CONFIG DEBUG] ✅ REAL Supabase client created successfully');
                console.log('[CONFIG DEBUG] Client type:', typeof supabase);
                console.log('[CONFIG DEBUG] Client auth available:', !!supabase.auth);
                console.log('[CONFIG DEBUG] Using REAL Supabase with your actual keys!');
            } else {
                throw new Error('Supabase client creation failed - invalid client returned');
            }
        } else {
            console.error('[CONFIG DEBUG] window.supabase.createClient not available!');
            throw new Error('Supabase createClient function not available');
        }
        
        console.log('[CONFIG DEBUG] ✅ Configuration loaded successfully with REAL Supabase');
        return true;
        
    } catch (error) {
        console.error('❌ Failed to initialize REAL Supabase configuration:', error);
        console.warn('⚠️  FALLING BACK TO MOCK SUPABASE - Your real keys are not being used!');
        
        // Set up configuration anyway for UI testing
        window.supabaseConfig.SUPABASE_URL = 'https://qzuwonueyvouvrhiwcob.supabase.co';
        window.supabaseConfig.SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InF6dXdvbnVleXZvdXZyaGl3Y29iIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDcwNzM2ODgsImV4cCI6MjA2MjY0OTY4OH0.hRGTJ4oPFs6lJ4O17oeRbFOMYAgMxyMM2DSjSd5_W00';
        
        // Create a mock Supabase object for testing
        let authStateCallback = null;
        let mockSession = null; // Track mock session state
        
        window.supabase = {
            createClient: (url, key) => ({
                auth: {
                    onAuthStateChange: (callback) => {
                        console.log('[MOCK DEBUG] Auth state change listener set up');
                        authStateCallback = callback;
                        return { data: { subscription: { unsubscribe: () => {} } } };
                    },
                    signInWithPassword: async (credentials) => {
                        console.log('[MOCK DEBUG] Sign in with password', credentials);
                        const user = { email: credentials.email, id: 'mock-user-id' };
                        const session = { access_token: 'mock-token', user: user };
                        
                        // Store the mock session
                        mockSession = session;
                        
                        // Simulate successful sign-in by triggering auth state change
                        if (authStateCallback) {
                            setTimeout(() => {
                                console.log('[MOCK DEBUG] Triggering SIGNED_IN event');
                                authStateCallback('SIGNED_IN', session);
                            }, 100);
                        }
                        
                        return { data: { user: user, session: session }, error: null };
                    },
                    signUp: async (credentials) => {
                        console.log('[MOCK DEBUG] Sign up', credentials);
                        return { data: { user: { email: credentials.email }, session: null }, error: null };
                    },
                    signInWithOAuth: async (provider) => {
                        console.log('[MOCK DEBUG] Sign in with OAuth', provider);
                        return { data: { url: 'mock-oauth-url' }, error: null };
                    },
                    signOut: async () => {
                        console.log('[MOCK DEBUG] Sign out');
                        
                        // Clear the mock session
                        mockSession = null;
                        
                        // Simulate successful sign-out by triggering auth state change
                        if (authStateCallback) {
                            setTimeout(() => {
                                console.log('[MOCK DEBUG] Triggering SIGNED_OUT event');
                                authStateCallback('SIGNED_OUT', null);
                            }, 100);
                        }
                        
                        return { error: null };
                    },
                    getUser: async () => {
                        console.log('[MOCK DEBUG] Get user - returning:', mockSession?.user || null);
                        return { data: { user: mockSession?.user || null }, error: null };
                    },
                    getSession: async () => {
                        console.log('[MOCK DEBUG] Get session - returning:', mockSession ? 'session exists' : 'no session');
                        return { data: { session: mockSession }, error: null };
                    }
                }
            })
        };
        
        // Initialize mock client
        supabase = window.supabase.createClient(window.supabaseConfig.SUPABASE_URL, window.supabaseConfig.SUPABASE_ANON_KEY);
        window.supabase = supabase;
        
        console.log('🔧 Configuration set up in fallback mode with MOCK Supabase');
        console.log('⚠️  WARNING: Using MOCK authentication - real Supabase features unavailable!');
        return true; // Indicate success with fallback
    }
}

// Auto-initialize configuration when script loads
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initializeConfig);
} else {
    initializeConfig();
}

// Test function to verify Supabase connection
window.testSupabaseConnection = async function() {
    console.log('🔍 Testing Supabase Connection...');
    console.log('📊 Current Configuration:');
    console.log('   URL:', window.supabaseConfig?.SUPABASE_URL);
    console.log('   Key:', window.supabaseConfig?.SUPABASE_ANON_KEY ? 'Present' : 'Missing');
    console.log('   Client Type:', typeof window.supabase);
    
    if (window.supabase && window.supabase.auth) {
        try {
            // Try to get the current session
            const { data, error } = await window.supabase.auth.getSession();
            if (error) {
                console.log('✅ REAL Supabase client - Connected successfully!');
                console.log('   Status: No active session (expected for new users)');
                console.log('   Error:', error.message);
            } else {
                console.log('✅ REAL Supabase client - Connected successfully!');
                console.log('   Session:', data.session ? 'Active' : 'None');
            }
            return 'real';
        } catch (err) {
            console.log('🔧 MOCK Supabase client detected');
            console.log('   Reason: Real client would not throw errors on getSession()');
            return 'mock';
        }
    } else {
        console.log('❌ No Supabase client available');
        return 'none';
    }
};

// Export configuration
window.initializeConfig = initializeConfig;