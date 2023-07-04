import { Message } from "./Conversation";

/**
 * Statistics about the messages in the history.
 */
export interface HistoryStats {
  /** The number of messages in the history for the actor. */
  count: number;
  /** The total number of characters in the messages. */
  textCount: number;
  /** The percentage of messages that are from the actor. */
  percentage: number;
  /** The percentage of characters in the messages that are from the actor. */
  textPercentage: number;
}

/**
 * A conversation history. The history is shared between all actors in the
 * conversation, and is used to store information about the conversation.
 */
export class ConversationHistory {
  /** The messages in the history. */
  readonly messages: Message[] = [];

  /**
   * Create a new conversation history.
   * @param messages The messages in the history.
   * @returns A new conversation history.
   */
  constructor(messages?: Message[]) {
    if (messages?.length) {
      this.messages.push(...messages);
    }
  }

  /**
   * Add a new message to the history. The message is shared between all actors
   * in the conversation, and is used to store information about the
   * conversation.
   * @param message The message to add.
   */
  push(message: PartialBy<Message, "feedback">): void {
    this.messages.push({ feedback: [0, 0], ...message });
  }

  /**
   * Get the messages sent by an actor. The messages are shared between all
   * actors in the conversation, and are used to store information about the
   * conversation.
   * @param actor The name of the actor.
   * @returns The messages sent by the actor.
   */
  getMessagesFor(actor: string): ReadonlyMap<number, Message> {
    return new Map(
      this.messages
        .filter((message) => message.actor === actor)
        .map((message, index) => [index, message]),
    );
  }

  /**
   * Get statistics about the messages in the history.
   * @returns Statistics about the messages in the history.
   */
  getStats(): Record<string, HistoryStats> {
    const stats: Record<string, HistoryStats> = {};

    let total = 0;
    let textTotal = 0;

    for (const message of this.messages) {
      total++;
      textTotal += message.text.length;

      stats[message.actor] = {
        ...stats[message.actor] ?? {},
        count: (stats[message.actor]?.count ?? 0) + 1,
        textCount: (stats[message.actor]?.textCount ?? 0) + message.text.length,
      };
    }

    for (const actor in stats) {
      stats[actor].percentage = stats[actor].count / total;
      stats[actor].textPercentage = stats[actor].textCount / textTotal;
    }

    return stats;
  }

  /**
   * Remove ephemeral messages from the history. Ephemeral messages are
   * messages that are not part of the conversation, and are only added
   * for a single turn.
   */
  cleanEphemeral(): void {
    const messages = this.messages.reduce(
      (indexes, message, index) => {
        if (message.ephemeral) {
          indexes.push(index);
        }
        return indexes;
      },
      [] as number[],
    );

    if (messages.length) {
      for (const index of messages) {
        this.messages.splice(index, 1);
      }
    }
  }

  /**
   * Add positive feedback to a message.
   * @param message The message to add feedback to.
   */
  up(message: Message) {
    if (!this.messages.includes(message)) {
      throw new Error("Message not found");
    }

    message.feedback[0]++;
  }

  /**
   * Add negative feedback to a message.
   * @param message The message to add feedback to.
   */
  down(message: Message) {
    if (!this.messages.includes(message)) {
      throw new Error("Message not found");
    }

    message.feedback[1]++;
  }

  /**
   * Get the first message in the history.
   */
  first(): Message | undefined {
    return this.messages[0];
  }

  /**
   * Get the last message in the history.
   */
  last(): Message | undefined {
    return this.messages[this.messages.length - 1];
  }

  /**
   * Transform the history into a JSON-serializable object.
   */
  toJSON() {
    return {
      messages: this.messages,
    };
  }

  /**
   * Clear the history.
   */
  clear(): void {
    this.messages.length = 0;
  }
}

export type PartialBy<T, K extends keyof T> = Omit<T, K> & Partial<Pick<T, K>>;
