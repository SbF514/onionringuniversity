(function() {
  var game = new Game();
  var auth = window.SupabaseAuth;
  var settingsUI = new SettingsUI();
  var settingsInitialized = false;

  var loadingScreen = document.getElementById('loading-screen');
  var loginScreen = document.getElementById('login-screen');
  var gameScreen = document.getElementById('game-screen');

  var authForm = document.getElementById('login-form');
  var emailInput = document.getElementById('email-input');
  var passwordInput = document.getElementById('password-input');
  var authBtn = document.getElementById('auth-btn');
  var authError = document.getElementById('auth-error');
  var authTabs = document.querySelectorAll('.auth-tab');

  var isSignUp = false;

  if (!auth.init()) {
    hideLoading();
    showError('Failed to initialize authentication');
    return;
  }

  var versionEl = document.getElementById('version-indicator');
  if (versionEl && window.gameConfig) {
    versionEl.textContent = 'v' + (window.gameConfig.version || '0.0.0');
  }

  settingsUI.init({
    onSave: async function(updates) {
      await auth.updateProfile(updates);
      if (game.localPlayer) {
        game.localPlayer.username = updates.display_name;
        game.localPlayer.color = updates.color;
      }
    },
    onLogout: async function() {
      await auth.signOut();
      game.stop();
      gameScreen.style.display = 'none';
      loginScreen.style.display = 'flex';
    }
  });
  settingsInitialized = true;

  authTabs.forEach(function(tab) {
    tab.addEventListener('click', function() {
      authTabs.forEach(function(t) { t.classList.remove('active'); });
      tab.classList.add('active');
      isSignUp = tab.dataset.tab === 'signup';
      authBtn.textContent = isSignUp ? 'Sign Up' : 'Sign In';
      hideError();
    });
  });

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

  (async function() {
    try {
      var session = await auth.getSession();
      if (session) {
        await onLoginSuccess();
      }
    } catch (err) {
      // session check failed
    }
    hideLoading();
  })();

  function hideLoading() {
    if (loadingScreen) {
      loadingScreen.style.opacity = '0';
      setTimeout(function() {
        loadingScreen.style.display = 'none';
      }, 300);
    }
  }

  async function onLoginSuccess() {
    var profile;
    try {
      profile = await auth.ensureProfile();
    } catch (e) {
      profile = { display_name: auth.user ? auth.user.email.split('@')[0] : 'Player', color: '#667eea' };
    }

    var token = await auth.getAccessToken();

    loginScreen.style.display = 'none';
    gameScreen.style.display = 'block';

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
