// Main entry point
(function() {
  var game = new Game();
  var auth = window.SupabaseAuth;
  var settingsUI = new SettingsUI();

  // Auth form elements
  var authForm = document.getElementById('login-form');
  var emailInput = document.getElementById('email-input');
  var passwordInput = document.getElementById('password-input');
  var authBtn = document.getElementById('auth-btn');
  var authError = document.getElementById('auth-error');
  var authTabs = document.querySelectorAll('.auth-tab');

  var isSignUp = false;

  // Initialize Supabase
  if (!auth.init()) {
    showError('Failed to initialize authentication');
    return;
  }

  // Auth tab switching
  authTabs.forEach(function(tab) {
    tab.addEventListener('click', function() {
      authTabs.forEach(function(t) { t.classList.remove('active'); });
      tab.classList.add('active');
      isSignUp = tab.dataset.tab === 'signup';
      authBtn.textContent = isSignUp ? 'Sign Up' : 'Sign In';
      hideError();
    });
  });

  // Auth form submit
  authForm.addEventListener('submit', async function(e) {
    e.preventDefault();
    var email = emailInput.value.trim();
    var password = passwordInput.value;

    if (!email || !password) {
      showError('Please fill in all fields');
      return;
    }

    authBtn.disabled = true;
    authBtn.textContent = isSignUp ? 'Creating account...' : 'Signing in...';
    hideError();

    try {
      if (isSignUp) {
        await auth.signUp(email, password);
        showError('Check your email for confirmation link');
        authBtn.textContent = 'Sign In';
        isSignUp = false;
        authTabs[0].click();
      } else {
        await auth.signIn(email, password);
        await onLoginSuccess();
      }
    } catch (err) {
      showError(err.message || 'Authentication failed');
    } finally {
      authBtn.disabled = false;
      authBtn.textContent = isSignUp ? 'Sign Up' : 'Sign In';
    }
  });

  // Check for existing session
  (async function() {
    try {
      var session = await auth.getSession();
      if (session) {
        await onLoginSuccess();
      }
    } catch (err) {
      // No session, stay on login screen
    }
  })();

  async function onLoginSuccess() {
    var profile = await auth.ensureProfile();
    var token = await auth.getAccessToken();

    document.getElementById('login-screen').style.display = 'none';
    document.getElementById('game-screen').style.display = 'block';

    settingsUI.init({
      onSave: async function(updates) {
        await auth.updateProfile(updates);
        if (game.localPlayer) {
          game.localPlayer.username = updates.display_name;
          game.localPlayer.color = updates.color;
        }
      },
      logout: async function() {
        await auth.signOut();
        game.stop();
        document.getElementById('game-screen').style.display = 'none';
        document.getElementById('login-screen').style.display = 'flex';
      }
    });
    settingsUI.loadProfile(profile);

    var protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    var wsHost = window.gameConfig ? window.gameConfig.wsHost : window.location.hostname;
    var wsPort = window.gameConfig ? window.gameConfig.wsPort : '3001';
    var portStr = (wsPort === '443' && protocol === 'wss:') || (wsPort === '80' && protocol === 'ws:') ? '' : ':' + wsPort;
    var wsUrl = protocol + '//' + wsHost + portStr + '/ws';

    game.start(profile.display_name || auth.user.email, wsUrl, profile, token);
  }

  function showError(msg) {
    authError.textContent = msg;
    authError.style.display = 'block';
  }

  function hideError() {
    authError.style.display = 'none';
  }
})();
