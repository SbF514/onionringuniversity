// Main entry point
(function() {
  var game = new Game();
  var joinBtn = document.getElementById('join-btn');
  var usernameInput = document.getElementById('username-input');

  function startGame() {
    var username = usernameInput.value.trim();
    if (username.length < 1) {
      username = 'Student_' + Math.floor(Math.random() * 9999);
    }

    // Determine WebSocket URL
    var protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    var wsHost = window.gameConfig ? window.gameConfig.wsHost : window.location.hostname;
    var wsPort = window.gameConfig ? window.gameConfig.wsPort : '3001';
    var wsUrl = protocol + '//' + wsHost + ':' + wsPort + '/ws';

    game.start(username, wsUrl);
  }

  joinBtn.addEventListener('click', startGame);
  usernameInput.addEventListener('keydown', function(e) {
    if (e.key === 'Enter') startGame();
  });
})();
