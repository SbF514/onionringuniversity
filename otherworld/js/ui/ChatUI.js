class ChatUI {
  constructor(gameState) {
    this.gameState = gameState;
    this.messagesEl = document.getElementById('chat-messages');
    this.inputEl = document.getElementById('chat-input');
    this.sendCallback = null;

    var self = this;
    this.inputEl.addEventListener('keydown', function(e) {
      if (e.key === 'Enter') {
        var text = self.inputEl.value.trim();
        if (text.length > 0 && self.sendCallback) {
          self.sendCallback(text);
          self.addLocalMessage(text);
          self.inputEl.value = '';
        }
        e.preventDefault();
      }
    });
  }

  onSend(callback) {
    this.sendCallback = callback;
  }

  addLocalMessage(text) {
    this.gameState.addChatMessage('local', text, Date.now());
    this.renderMessages();
  }

  addSystemMessage(text) {
    var div = document.createElement('div');
    div.className = 'chat-msg system';
    div.textContent = text;
    this.messagesEl.appendChild(div);
    this.messagesEl.scrollTop = this.messagesEl.scrollHeight;
  }

  addPlayerMessage(playerId, username, text) {
    var div = document.createElement('div');
    div.className = 'chat-msg';
    div.innerHTML = '<span class="name">' + this.escapeHtml(username) + ':</span> <span class="text">' + this.escapeHtml(text) + '</span>';
    this.messagesEl.appendChild(div);
    this.messagesEl.scrollTop = this.messagesEl.scrollHeight;
  }

  renderMessages() {
    // Clear and re-render from gameState
    this.messagesEl.innerHTML = '';
    var msgs = this.gameState.chatMessages.slice(-30);
    for (var i = 0; i < msgs.length; i++) {
      var msg = msgs[i];
      if (msg.playerId === 'local') {
        var div = document.createElement('div');
        div.className = 'chat-msg';
        div.innerHTML = '<span class="name">You:</span> <span class="text">' + this.escapeHtml(msg.text) + '</span>';
        this.messagesEl.appendChild(div);
      }
    }
    this.messagesEl.scrollTop = this.messagesEl.scrollHeight;
  }

  escapeHtml(str) {
    var div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
  }
}
