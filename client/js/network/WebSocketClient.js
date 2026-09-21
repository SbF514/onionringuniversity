class WebSocketClient {
  constructor(url) {
    this.url = url;
    this.ws = null;
    this.connected = false;
    this.playerId = null;
    this.handlers = {};
    this.reconnectDelay = 1000;
    this.maxReconnectDelay = 30000;
    this.messageQueue = [];
  }

  connect() {
    var self = this;
    this.ws = new WebSocket(this.url);

    this.ws.onopen = function() {
      self.connected = true;
      self.reconnectDelay = 1000;
      self.emit('connected');
      // Flush queued messages
      while (self.messageQueue.length > 0) {
        var msg = self.messageQueue.shift();
        self.ws.send(msg);
      }
    };

    this.ws.onmessage = function(event) {
      try {
        var msg = JSON.parse(event.data);
        self.emit(msg.type, msg);
      } catch (e) {
        console.error('Parse error:', e);
      }
    };

    this.ws.onclose = function() {
      self.connected = false;
      self.emit('disconnected');
      self.scheduleReconnect();
    };

    this.ws.onerror = function(err) {
      console.error('WebSocket error:', err);
    };
  }

  scheduleReconnect() {
    var self = this;
    setTimeout(function() {
      self.reconnectDelay = Math.min(self.reconnectDelay * 2, self.maxReconnectDelay);
      self.connect();
    }, this.reconnectDelay);
  }

  send(type, payload) {
    var msg = JSON.stringify({
      type: type,
      timestamp: Date.now(),
      playerId: this.playerId || '',
      payload: payload,
    });
    if (this.connected && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(msg);
    } else {
      this.messageQueue.push(msg);
    }
  }

  on(type, handler) {
    if (!this.handlers[type]) this.handlers[type] = [];
    this.handlers[type].push(handler);
  }

  emit(type, data) {
    var handlers = this.handlers[type];
    if (handlers) {
      for (var i = 0; i < handlers.length; i++) {
        handlers[i](data);
      }
    }
  }

  close() {
    if (this.ws) {
      this.ws.close();
    }
  }
}
