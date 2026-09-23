/**
 * Supabase Auth module for OnionRingUniversity
 * Handles email/password auth and user profiles
 */
class SupabaseAuth {
  constructor() {
    this.client = null;
    this.user = null;
    this.profile = null;
  }

  /**
   * Initialize Supabase client
   */
  init() {
    if (!window.gameConfig || !window.gameConfig.supabase) {
      console.error('Supabase config missing in gameConfig.supabase');
      return false;
    }
    const { url, anonKey } = window.gameConfig.supabase;
    this.client = window.supabase.createClient(url, anonKey);
    return true;
  }

  /**
   * Sign up with email and password
   */
  async signUp(email, password) {
    const { data, error } = await this.client.auth.signUp({
      email,
      password
    });
    if (error) throw error;
    this.user = data.user;
    return data;
  }

  /**
   * Sign in with email and password
   */
  async signIn(email, password) {
    const { data, error } = await this.client.auth.signInWithPassword({
      email,
      password
    });
    if (error) throw error;
    this.user = data.user;
    return data;
  }

  /**
   * Sign out
   */
  async signOut() {
    const { error } = await this.client.auth.signOut();
    if (error) throw error;
    this.user = null;
    this.profile = null;
  }

  /**
   * Get current user
   */
  async getCurrentUser() {
    const { data: { user } } = await this.client.auth.getUser();
    this.user = user;
    return user;
  }

  /**
   * Get current session
   */
  async getSession() {
    const { data: { session } } = await this.client.auth.getSession();
    if (session) {
      this.user = session.user;
    }
    return session;
  }

  /**
   * Get user profile from profiles table
   */
  async getProfile() {
    if (!this.user) return null;

    const { data, error } = await this.client
      .from('profiles')
      .select('*')
      .eq('id', this.user.id)
      .single();

    if (error && error.code !== 'PGRST116') {
      console.error('Error fetching profile:', error);
      return null;
    }

    this.profile = data;
    return data;
  }

  /**
   * Create or update user profile
   */
  async updateProfile(updates) {
    if (!this.user) throw new Error('Not authenticated');

    const profileData = {
      id: this.user.id,
      email: this.user.email,
      ...updates,
      updated_at: new Date().toISOString()
    };

    const { data, error } = await this.client
      .from('profiles')
      .upsert(profileData)
      .select()
      .single();

    if (error) throw error;
    this.profile = data;
    return data;
  }

  /**
   * Initialize profile if it doesn't exist
   */
  async ensureProfile() {
    let profile = await this.getProfile();
    if (!profile) {
      profile = await this.updateProfile({
        display_name: this.user.email.split('@')[0],
        color: '#667eea'
      });
    }
    return profile;
  }

  /**
   * Get access token for WebSocket auth
   */
  async getAccessToken() {
    const session = await this.getSession();
    return session ? session.access_token : null;
  }
}

// Export singleton
window.SupabaseAuth = new SupabaseAuth();
