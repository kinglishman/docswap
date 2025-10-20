/* DocSwap - Supabase Configuration */

// Configuration - Auto-detect environment
const API_BASE_URL = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
    ? 'http://localhost:5001'  // Local development - Flask backend
    : window.location.origin;  // Production - same origin as frontend

// Make API_BASE_URL globally available
window.API_BASE_URL = API_BASE_URL;

// Global configuration object
window.supabaseConfig = {
    SUPABASE_URL: null,
    SUPABASE_ANON_KEY: null
};

// Global supabase client
let supabase = null;

// Check if Supabase is available
async function waitForSupabaseScript() {
    return new Promise((resolve, reject) => {
        let attempts = 0;
        const maxAttempts = 50; // 5 seconds timeout
        
        const checkSupabase = () => {
            attempts++;
            
            if (window.supabase && typeof window.supabase.createClient === 'function') {
                console.log('[CONFIG DEBUG] ✅ Supabase library is available');
                resolve();
            } else if (attempts >= maxAttempts) {
                console.error('[CONFIG DEBUG] ❌ Timeout waiting for Supabase library');
                reject(new Error('Supabase library failed to load'));
            } else {
                console.log(`[CONFIG DEBUG] Waiting for Supabase library... (${attempts}/${maxAttempts})`);
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
        try {
            await waitForSupabaseScript();
            console.log('[CONFIG DEBUG] Supabase library loaded');
            console.log('[CONFIG DEBUG] Current window.supabase before init:', typeof window.supabase);
        } catch (error) {
            console.error('[CONFIG DEBUG] ❌ Failed to load Supabase library:', error);
            // Show user-friendly error message
            const authMessage = document.querySelector('.auth-message');
            if (authMessage) {
                authMessage.textContent = 'Authentication service is temporarily unavailable. Please refresh the page.';
                authMessage.style.display = 'block';
            }
            return; // Exit early if Supabase fails to load
        }
        
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
            console.error('[CONFIG DEBUG] Backend API not available - cannot proceed without real credentials');
            throw new Error(`Backend API unavailable: ${apiError.message}`);
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
        console.error('❌ Failed to initialize Supabase configuration:', error);
        console.error('❌ Cannot proceed without valid Supabase credentials from backend API');
        throw error; // Re-throw the error to prevent app from running with invalid config
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