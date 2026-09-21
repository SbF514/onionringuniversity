class InputManager {
  constructor() {
    this.keys = {};
    this.chatFocused = false;

    document.addEventListener('keydown', function(e) {
      var key = e.key.toLowerCase();
      this.keys[key] = true;

      // Prevent game input when typing in chat
      if (this.chatFocused) {
        if (key === 'escape') {
          document.getElementById('chat-input').blur();
          e.preventDefault();
        }
        return;
      }

      // Arrow keys scroll the page — prevent that
      if (key.startsWith('arrow')) {
        e.preventDefault();
      }
    }.bind(this));

    document.addEventListener('keyup', function(e) {
      this.keys[e.key.toLowerCase()] = false;
    }.bind(this));

    // Track chat focus
    var chatInput = document.getElementById('chat-input');
    if (chatInput) {
      chatInput.addEventListener('focus', function() {
        this.chatFocused = true;
      }.bind(this));
      chatInput.addEventListener('blur', function() {
        this.chatFocused = false;
      }.bind(this));
    }
  }

  isInputActive() {
    return this.chatFocused;
  }
}
