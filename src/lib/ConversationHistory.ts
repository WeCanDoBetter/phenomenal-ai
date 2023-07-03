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
   * @param actor The actor that sent the message.
   * @param text The text of the message.
   * @param embeddings The embeddings of the message. Embeddings are used to
   * determine the similarity between messages.
   */
  push(actor: string, text: string, embeddings?: number[]): void {
    this.messages.push({ actor, text, embeddings });
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
   * @returns The JSON-serializable object.
   */
  toJSON(): ReadonlyArray<Message> {
    return this.messages;
  }

  /**
   * Clear the history.
   */
  clear(): void {
    this.messages.length = 0;
  }
}
