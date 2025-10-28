const { createClient } = require('@supabase/supabase-js');

// Initialize Supabase client
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  throw new Error('Missing Supabase environment variables');
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

// Session management functions
async function createOrUpdateSession(sessionId, fileData) {
  try {
    // First, try to get existing session
    const { data: existingSession, error: fetchError } = await supabase
      .from('sessions')
      .select('*')
      .eq('session_id', sessionId)
      .single();

    if (existingSession) {
      // Update existing session with new file data
      const updatedData = { ...existingSession.data, [fileData.fileId]: fileData };
      
      const { data, error } = await supabase
        .from('sessions')
        .update({
          data: updatedData,
          file_count: Object.keys(updatedData).length,
          last_activity: new Date().toISOString()
        })
        .eq('session_id', sessionId)
        .select()
        .single();

      if (error) throw error;
      return data;
    } else {
      // Create new session
      const sessionData = { [fileData.fileId]: fileData };
      
      const { data, error } = await supabase
        .from('sessions')
        .insert({
          session_id: sessionId,
          data: sessionData,
          file_count: 1,
          last_activity: new Date().toISOString(),
          expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString() // 24 hours
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    }
  } catch (error) {
    console.error('Error creating/updating session:', error);
    throw error;
  }
}

async function getSessionData(sessionId) {
  try {
    const { data, error } = await supabase
      .from('sessions')
      .select('*')
      .eq('session_id', sessionId)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        // No session found
        return null;
      }
      throw error;
    }

    // Check if session has expired
    if (new Date(data.expires_at) < new Date()) {
      // Session expired, delete it
      await supabase
        .from('sessions')
        .delete()
        .eq('session_id', sessionId);
      return null;
    }

    return data;
  } catch (error) {
    console.error('Error getting session data:', error);
    throw error;
  }
}

async function getFileMetadata(sessionId, fileId) {
  try {
    const sessionData = await getSessionData(sessionId);
    if (!sessionData || !sessionData.data) {
      return null;
    }
    
    return sessionData.data[fileId] || null;
  } catch (error) {
    console.error('Error getting file metadata:', error);
    return null;
  }
}

async function updateFileConversion(sessionId, fileId, conversionData) {
  try {
    const sessionData = await getSessionData(sessionId);
    if (!sessionData) {
      throw new Error('Session not found');
    }

    const fileData = sessionData.data[fileId];
    if (!fileData) {
      throw new Error('File not found in session');
    }

    // Update file data with conversion info
    fileData.conversions = fileData.conversions || {};
    fileData.conversions[conversionData.conversionId] = conversionData;

    const updatedSessionData = { ...sessionData.data, [fileId]: fileData };

    const { data, error } = await supabase
      .from('sessions')
      .update({
        data: updatedSessionData,
        last_activity: new Date().toISOString()
      })
      .eq('session_id', sessionId)
      .select()
      .single();

    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Error updating file conversion:', error);
    throw error;
  }
}

module.exports = {
  supabase,
  createOrUpdateSession,
  getSessionData,
  getFileMetadata,
  updateFileConversion
};