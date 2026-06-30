import { REACTION_DATA, REACTION_STATES } from './reactionData.js';

export class ReactionEngine {
  constructor(data = REACTION_DATA) {
    this.data = data;
    this.lastMessageByState = new Map();
    this.lastMessageGlobal = '';
  }

  resolveRemainingState(remaining) {
    if (remaining <= 0) return REACTION_STATES.EMPTY;
    if (remaining === 1) return REACTION_STATES.LAST_FOOD;
    if (remaining <= 5) return REACTION_STATES.REMAINING_5_TO_2;
    if (remaining <= 10) return REACTION_STATES.REMAINING_10_TO_6;
    if (remaining <= 20) return REACTION_STATES.REMAINING_20_TO_11;
    return REACTION_STATES.REMAINING_GT_20;
  }

  pick(state, params = {}) {
    const pack = this.data[state];
    if (!pack) {
      return {
        state,
        emoji: '🙂',
        message: '',
      };
    }

    const emoji = this.pickRandom(pack.emojis) || '🙂';
    const previousStateMessage = this.lastMessageByState.get(state) || '';
    let messageTemplate = this.pickRandom(pack.messages) || '';

    if (pack.messages.length > 1) {
      let guard = 0;
      while ((messageTemplate === previousStateMessage || messageTemplate === this.lastMessageGlobal) && guard < 20) {
        messageTemplate = this.pickRandom(pack.messages) || '';
        guard += 1;
      }
    }

    this.lastMessageByState.set(state, messageTemplate);
    this.lastMessageGlobal = messageTemplate;

    return {
      state,
      emoji,
      message: messageTemplate.replaceAll('{count}', String(params.count ?? '')),
    };
  }

  pickRandom(items) {
    if (!Array.isArray(items) || !items.length) return '';
    return items[Math.floor(Math.random() * items.length)];
  }
}