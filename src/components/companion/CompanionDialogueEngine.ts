import { CompanionReactionType } from '../../types/companion';
import { CharacterProfile } from '../../types';

export interface DialogueResult {
  reply: string;
  reaction: CompanionReactionType;
  soundEffect?: 'star' | 'pop' | 'sparkle' | 'fanfare' | 'whoosh' | 'spring' | 'tada';
}

/**
 * Child-friendly contextual conversational dialogue engine
 * Provides warm, playful, and instant responses to speech or quick interaction prompts.
 */
export class CompanionDialogueEngine {
  /**
   * Quick string response helper
   */
  public static generateResponse(phrase: string, character: CharacterProfile): string {
    return this.respondToChild(phrase, character).reply;
  }

  /**
   * Generates a delightful cartoon response based on what the child said or did
   */
  public static respondToChild(
    phrase: string,
    character: CharacterProfile
  ): DialogueResult {
    const text = phrase.toLowerCase().trim();

    // 1. Greetings
    if (
      text.includes('hello') ||
      text.includes('hi') ||
      text.includes('hey') ||
      text.includes('good morning') ||
      text.includes('howdy')
    ) {
      const greetings = [
        `Hello best buddy! 👋 I am so happy to see you!`,
        `Hi there superstar! 👋 Give me a big wave!`,
        `Yaaay, hello! 👋 Let's have an adventure today!`,
      ];
      return {
        reply: greetings[Math.floor(Math.random() * greetings.length)],
        reaction: 'waving',
        soundEffect: 'pop',
      };
    }

    // 2. Jumping / High Energy
    if (
      text.includes('jump') ||
      text.includes('hop') ||
      text.includes('bounce') ||
      text.includes('higher') ||
      text.includes('kangaroo')
    ) {
      return {
        reply: `Boing boing boing! 🦘 Look at you jumping up to the clouds!`,
        reaction: 'jumping',
        soundEffect: 'spring',
      };
    }

    // 3. Dancing / Music / Party
    if (
      text.includes('dance') ||
      text.includes('party') ||
      text.includes('shake') ||
      text.includes('music') ||
      text.includes('groove')
    ) {
      return {
        reply: `Dance party! 💃 Shake your shoulders and wiggle with me!`,
        reaction: 'cheering',
        soundEffect: 'tada',
      };
    }

    // 4. Smiles / Happiness
    if (
      text.includes('smile') ||
      text.includes('happy') ||
      text.includes('laugh') ||
      text.includes('funny') ||
      text.includes('giggle')
    ) {
      return {
        reply: `Hahaha! 😂 Your smile is brighter than a billion stars!`,
        reaction: 'laughing',
        soundEffect: 'sparkle',
      };
    }

    // 5. Jokes
    if (text.includes('joke') || text.includes('tell me a joke')) {
      const jokes = [
        `Why did the teddy bear say no to dessert? Because he was stuffed! Hehehe! 🧸`,
        `What do you call a sleeping dinosaur? A dino-snore! Zzz! 🦖`,
        `Why do birds fly south for the winter? Because it's too far to walk! 🐦`,
        `What is orange and sounds like a parrot? A carrot! 🥕`,
      ];
      return {
        reply: jokes[Math.floor(Math.random() * jokes.length)],
        reaction: 'laughing',
        soundEffect: 'pop',
      };
    }

    // 6. Cheering / Celebrations / Good Job
    if (
      text.includes('yay') ||
      text.includes('hurray') ||
      text.includes('we did it') ||
      text.includes('cheer') ||
      text.includes('win') ||
      text.includes('awesome')
    ) {
      return {
        reply: `Hooray! 🎉 You did it! You're a true cartoon champion!`,
        reaction: 'cheering',
        soundEffect: 'fanfare',
      };
    }

    // 7. Surprise / Wow / Look
    if (
      text.includes('wow') ||
      text.includes('whoa') ||
      text.includes('look') ||
      text.includes('magic') ||
      text.includes('surprise')
    ) {
      return {
        reply: `Whoaaaa! 😲 That is mind-bogglingly cool! Look at that!`,
        reaction: 'surprised',
        soundEffect: 'whoosh',
      };
    }

    // 8. Friendship / Love
    if (
      text.includes('friend') ||
      text.includes('love') ||
      text.includes('best') ||
      text.includes('like you')
    ) {
      return {
        reply: `Awww! 💖 You are my bestest cartoon friend in the universe!`,
        reaction: 'cheering',
        soundEffect: 'star',
      };
    }

    // 9. Identity / Name
    if (
      text.includes('who are you') ||
      text.includes('what is your name') ||
      text.includes('name')
    ) {
      return {
        reply: `I'm ${character.name}! ${character.tagline || 'Your interactive cartoon buddy!'} ✨`,
        reaction: 'waving',
        soundEffect: 'sparkle',
      };
    }

    // 10. Default playful cartoon echo & praise
    return {
      reply: `Hehehe! "${phrase}"! Let's strike a funny superhero pose! 🌟`,
      reaction: 'excited',
      soundEffect: 'star',
    };
  }
}
