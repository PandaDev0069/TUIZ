const DatabaseManager = require('../config/database');
const logger = require('../utils/logger');

// Initialize database
const db = new DatabaseManager();

// Environment detection for logging
const isDevelopment = process.env.NODE_ENV === 'development' || process.env.NODE_ENV !== 'production';
const isLocalhost = process.env.IS_LOCALHOST === 'true' || !process.env.NODE_ENV;

// Helper function to get authenticated user from token
const getAuthenticatedUser = async (authHeader) => {
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    throw new Error('Missing or invalid authorization header. Expected format: "Bearer <token>"');
  }
  
  const token = authHeader.substring(7);
  
  // Validate token is not empty or undefined
  if (!token || token === 'undefined' || token === 'null' || token.trim() === '') {
    throw new Error('Invalid token: Token is empty, undefined, or null');
  }
  
  logger.debug('🔐 Verifying Supabase JWT token');
  
  try {
    // Use Supabase admin client to verify the token
    const { data: { user }, error } = await db.supabaseAdmin.auth.getUser(token);
    
    if (error) {
      // Reduce logging noise for common auth failures
      const isExpiredToken = error.message.includes('expired') || error.message.includes('jwt_expired');
      const isInvalidToken = error.message.includes('invalid_token') || error.message.includes('jwt');
      
      if (isDevelopment && !isExpiredToken && !isInvalidToken) {
        // Only log unexpected errors in development
        logger.error('Supabase token verification error:', error.message);
      }
      
      if (error.message.includes('invalid_token') || error.message.includes('jwt')) {
        throw new Error('Invalid JWT token format or signature. Please check if you are sending the correct access_token.');
      }
      if (error.message.includes('expired')) {
        throw new Error('Token has expired. Please log in again to get a new token.');
      }
      if (error.message.includes('malformed')) {
        throw new Error('Malformed JWT token. Please check the token format.');
      }
      
      throw new Error('Token verification failed: ' + error.message);
    }
    
    if (!user) {
      throw new Error('No user found for this token. The token may be invalid or the user may have been deleted.');
    }
    
    logger.debug('✅ Supabase token verified for user:', user.id, user.email);
    
    // Get user profile from database using adminClient to bypass RLS
    const { data: userProfile, error: profileError } = await db.supabaseAdmin
      .from('users')
      .select('*')
      .eq('id', user.id)
      .single();
    
    if (profileError) {
      // Always log profile errors as they're critical
      logger.error('❌ Profile fetch error:', profileError);
      
      // If user profile doesn't exist, create it
      if (profileError.code === 'PGRST116') { // No rows returned
        logger.debug('🆕 Creating user profile for:', user.email);
        const { data: newProfile, error: createError } = await db.supabaseAdmin
          .from('users')
          .insert({
            id: user.id,
            email: user.email,
            name: user.user_metadata?.name || user.user_metadata?.full_name || user.email?.split('@')[0] || 'User'
          })
          .select()
          .single();
        
        if (createError) {
          // Always log creation errors as they're critical
          logger.error('❌ Failed to create user profile:', createError);
          throw new Error('Failed to create user profile: ' + createError.message);
        }
        
        logger.debug('✅ User profile created:', newProfile.name, newProfile.email);
        return newProfile;
      } else {
        throw new Error('User profile fetch failed: ' + profileError.message);
      }
    }
    
    if (!userProfile) {
      throw new Error('User profile not found in database');
    }
    
    logger.debug('✅ User profile found:', userProfile.name, userProfile.email);
    return userProfile;
    
  } catch (error) {
    // Reduce logging noise for common auth failures
    const isExpiredToken = error.message.includes('expired') || error.message.includes('jwt expired');
    const isInvalidToken = error.message.includes('invalid') || error.message.includes('jwt');
    
    if (isDevelopment && !isExpiredToken && !isInvalidToken) {
      // Only log unexpected auth errors in development
      logger.error('Authentication error details:', error.message);
    }
    throw error;
  }
};

module.exports = {
  getAuthenticatedUser
};
