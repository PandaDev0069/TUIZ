const jwt = require('jsonwebtoken');

class SupabaseAuthHelper {
  constructor(supabaseAdmin) {
    this.supabaseAdmin = supabaseAdmin;
    // Use Supabase's JWT secret for manual verification if needed
    this.jwtSecret = process.env.SUPABASE_JWT_SECRET;
  }

  /**
   * Verify Supabase JWT token and return user information
   * @param {string} authHeader - Authorization header (Bearer token)
   * @returns {Promise<Object>} User profile object
   */
  async verifyAndGetUser(authHeader) {
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new Error('Missing or invalid authorization header. Expected format: "Bearer <token>"');
    }
    
    const token = authHeader.substring(7);
    
    // Validate token is not empty or undefined
    if (!token || token === 'undefined' || token === 'null' || token.trim() === '') {
      throw new Error('Invalid token: Token is empty, undefined, or null');
    }
    
    console.log('🔐 Verifying token:', token.substring(0, 20) + '...');
    console.log('🔐 Token length:', token.length);
    
    try {
      // Primary method: Use Supabase's built-in getUser method
      // This is the recommended way to verify Supabase tokens
      const { data: { user }, error } = await this.supabaseAdmin.auth.getUser(token);
      
      if (error) {
        console.error('❌ Supabase token verification error:', error);
        
        // Provide specific error messages based on error type
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
      
      console.log('✅ Token verified for user:', user.id, user.email);
      
      // Get user profile from database using adminClient to bypass RLS
      const { data: userProfile, error: profileError } = await this.supabaseAdmin
        .from('users')
        .select('*')
        .eq('id', user.id)
        .single();
      
      if (profileError) {
        console.error('❌ Profile fetch error:', profileError);
        
        // If user profile doesn't exist, create it
        if (profileError.code === 'PGRST116') { // No rows returned
          console.log('🆕 Creating user profile for:', user.email);
          const { data: newProfile, error: createError } = await this.supabaseAdmin
            .from('users')
            .insert({
              id: user.id,
              email: user.email,
              name: user.user_metadata?.name || user.user_metadata?.full_name || user.email?.split('@')[0] || 'User'
            })
            .select()
            .single();
          
          if (createError) {
            console.error('❌ Failed to create user profile:', createError);
            throw new Error('Failed to create user profile: ' + createError.message);
          }
          
          console.log('✅ User profile created:', newProfile.name, newProfile.email);
          return newProfile;
        } else {
          throw new Error('User profile fetch failed: ' + profileError.message);
        }
      }
      
      if (!userProfile) {
        throw new Error('User profile not found in database');
      }
      
      console.log('✅ User profile found:', userProfile.name, userProfile.email);
      return userProfile;
      
    } catch (error) {
      console.error('❌ Authentication error details:', error);
      
      // If Supabase method fails, try manual JWT verification as fallback
      if (this.jwtSecret && error.message.includes('Token verification failed')) {
        console.log('🔄 Attempting manual JWT verification as fallback...');
        return await this.manualJwtVerification(token);
      }
      
      throw error;
    }
  }

  /**
   * Manual JWT verification using Supabase's JWT secret (fallback method)
   * @param {string} token - JWT token
   * @returns {Promise<Object>} User profile object
   */
  async manualJwtVerification(token) {
    if (!this.jwtSecret) {
      throw new Error('SUPABASE_JWT_SECRET not configured for manual verification');
    }
    
    try {
      const decoded = jwt.verify(token, this.jwtSecret);
      console.log('✅ Manual JWT verification successful for user:', decoded.sub);
      
      // Get user profile from database
      const { data: userProfile, error: profileError } = await this.supabaseAdmin
        .from('users')
        .select('*')
        .eq('id', decoded.sub)
        .single();
      
      if (profileError && profileError.code !== 'PGRST116') {
        throw new Error('User profile fetch failed: ' + profileError.message);
      }
      
      // If profile doesn't exist, create it from JWT payload
      if (!userProfile) {
        const { data: newProfile, error: createError } = await this.supabaseAdmin
          .from('users')
          .insert({
            id: decoded.sub,
            email: decoded.email,
            name: decoded.user_metadata?.name || decoded.email?.split('@')[0] || 'User'
          })
          .select()
          .single();
        
        if (createError) {
          throw new Error('Failed to create user profile: ' + createError.message);
        }
        
        return newProfile;
      }
      
      return userProfile;
      
    } catch (jwtError) {
      console.error('❌ Manual JWT verification failed:', jwtError);
      
      if (jwtError.name === 'TokenExpiredError') {
        throw new Error('Token has expired. Please log in again.');
      }
      if (jwtError.name === 'JsonWebTokenError') {
        throw new Error('Invalid JWT token signature or format.');
      }
      if (jwtError.name === 'NotBeforeError') {
        throw new Error('Token not active yet.');
      }
      
      throw new Error('Manual JWT verification failed: ' + jwtError.message);
    }
  }

  /**
   * Debug token information (for development/debugging purposes)
   * @param {string} token - JWT token
   * @returns {Object} Token debug information
   */
  debugToken(token) {
    try {
      // Decode without verification to inspect token structure
      const decoded = jwt.decode(token, { complete: true });
      
      return {
        header: decoded?.header,
        payload: {
          sub: decoded?.payload?.sub,
          email: decoded?.payload?.email,
          exp: decoded?.payload?.exp,
          iat: decoded?.payload?.iat,
          iss: decoded?.payload?.iss,
          aud: decoded?.payload?.aud
        },
        isExpired: decoded?.payload?.exp ? Date.now() >= decoded.payload.exp * 1000 : false,
        expiresAt: decoded?.payload?.exp ? new Date(decoded.payload.exp * 1000).toISOString() : null
      };
    } catch (error) {
      return { error: 'Failed to decode token: ' + error.message };
    }
  }
}

module.exports = SupabaseAuthHelper;
