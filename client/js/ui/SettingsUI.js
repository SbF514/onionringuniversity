/**
 * Settings UI for School Metaverse
 * Handles display name, avatar color, and logout
 */
class SettingsUI {
  constructor() {
    this.modal = document.getElementById('settings-modal');
    this.closeBtn = document.getElementById('close-settings-btn');
    this.settingsBtn = document.getElementById('settings-btn');
    this.displayNameInput = document.getElementById('display-name-input');
    this.avatarColorInput = document.getElementById('avatar-color-input');
    this.saveBtn = document.getElementById('save-settings-btn');
    this.logoutBtn = document.getElementById('logout-btn');
    this.errorEl = document.getElementById('settings-error');
    this.successEl = document.getElementById('settings-success');
    this.onSave = null;
    this.onLogout = null;
  }

  init(callbacks) {
    this.onSave = callbacks.onSave;
    this.onLogout = callbacks.onLogout;

    // Open settings
    this.settingsBtn.addEventListener('click', () => {
      this.open();
    });

    // Close settings
    this.closeBtn.addEventListener('click', () => {
      this.close();
    });

    // Click outside to close
    this.modal.addEventListener('click', (e) => {
      if (e.target === this.modal) {
        this.close();
      }
    });

    // Save settings
    this.saveBtn.addEventListener('click', () => {
      this.save();
    });

    // Logout
    this.logoutBtn.addEventListener('click', () => {
      this.logout();
    });
  }

  open() {
    this.modal.style.display = 'flex';
    this.hideMessages();
  }

  close() {
    this.modal.style.display = 'none';
    this.hideMessages();
  }

  loadProfile(profile) {
    if (profile) {
      this.displayNameInput.value = profile.display_name || '';
      this.avatarColorInput.value = profile.color || '#667eea';
    }
  }

  async save() {
    const displayName = this.displayNameInput.value.trim();
    const color = this.avatarColorInput.value;

    if (!displayName) {
      this.showError('Display name is required');
      return;
    }

    this.saveBtn.disabled = true;
    this.saveBtn.textContent = 'Saving...';
    this.hideMessages();

    try {
      if (this.onSave) {
        await this.onSave({ display_name: displayName, color });
      }
      this.showSuccess('Settings saved!');
      setTimeout(() => this.hideMessages(), 2000);
    } catch (err) {
      this.showError(err.message || 'Failed to save settings');
    } finally {
      this.saveBtn.disabled = false;
      this.saveBtn.textContent = 'Save';
    }
  }

  async logout() {
    if (this.onLogout) {
      await this.onLogout();
    }
  }

  showError(msg) {
    this.errorEl.textContent = msg;
    this.errorEl.style.display = 'block';
    this.successEl.style.display = 'none';
  }

  showSuccess(msg) {
    this.successEl.textContent = msg;
    this.successEl.style.display = 'block';
    this.errorEl.style.display = 'none';
  }

  hideMessages() {
    this.errorEl.style.display = 'none';
    this.successEl.style.display = 'none';
  }
}

window.SettingsUI = SettingsUI;
