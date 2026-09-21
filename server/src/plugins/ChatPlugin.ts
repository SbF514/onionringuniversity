import { ServerPlugin, PluginContext, ChatMessage, PlayerState } from '@school-metaverse/shared';

const RATE_LIMIT_WINDOW = 5000;
const MAX_MESSAGES_PER_WINDOW = 5;

const PROFANITY_LIST = ['damn', 'hell']; // Basic filter, expand as needed

export class ChatPlugin implements ServerPlugin {
  metadata = {
    id: 'chat',
    name: 'Chat System',
    version: '1.0.0',
    description: 'Proximity-based text chat with rate limiting',
    author: 'school-metaverse',
  };

  private rateLimits = new Map<string, number[]>();

  onChatMessage(msg: ChatMessage, ctx: PluginContext): boolean | void {
    let text = msg.payload.text;
    for (const word of PROFANITY_LIST) {
      const regex = new RegExp('\\b' + word + '\\b', 'gi');
      text = text.replace(regex, '*'.repeat(word.length));
    }
    msg.payload.text = text;
  }
}
