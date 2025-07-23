// Simplified sound effects - disabled to avoid base64 conversion issues
class SoundEffects {
  private isEnabled: boolean = false; // Disabled by default

  // Initialize sound effects
  async initialize() {
    console.log('[SOUND] Sound effects disabled');
  }

  // Play keyboard tap sound
  async playKeyboardTap() {
    // Disabled
  }

  // Play send message sound
  async playSendMessage() {
    // Disabled
  }

  // Toggle sound effects
  toggleSound(enabled: boolean) {
    this.isEnabled = enabled;
  }

  // Cleanup sounds
  async cleanup() {
    // No cleanup needed
  }
}

// Export singleton instance
export const soundEffects = new SoundEffects(); 