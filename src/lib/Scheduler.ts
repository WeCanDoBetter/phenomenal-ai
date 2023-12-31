import { Conversation } from "./Conversation.js";
import { Actor } from "./Actor.js";

/**
 * A scheduler is used to determine which actor should speak next in a
 * conversation.
 */
export class Scheduler {
  /** The conversation that the scheduler is used in. */
  readonly conversation: Conversation;

  /**
   * Create a new scheduler.
   * @param conversation The conversation that the scheduler is used in.
   */
  constructor(conversation: Conversation) {
    this.conversation = conversation;
  }

  /**
   * Get the next actor that should speak in the conversation.
   */
  getNextSpeaker(): Actor {
    throw new Error("Not implemented");
  }

  /**
   * Transform the scheduler into a JSON-serializable object.
   */
  toJSON() {
    throw new Error("Not implemented");
  }
}

/**
 * A scheduler that selects the next actor in the conversation. The order of the
 * actors is determined by the order in which they were added to the
 * conversation.
 */
export class RoundRobinScheduler extends Scheduler {
  /** The index of the last actor that spoke. */
  private lastIndex = 0;

  getNextSpeaker(): Actor {
    return this.conversation
      .actors[this.lastIndex++ % this.conversation.actors.length];
  }

  toJSON() {
    return {
      type: "IndexScheduler",
      lastIndex: this.lastIndex,
    };
  }
}
