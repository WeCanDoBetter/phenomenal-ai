/**
 * A message in a conversation. Messages are used to communicate between actors
 * in a conversation. Messages are immutable.
 */
export interface Message {
  /** The actor that sent the message. */
  readonly actor: string;
  /** The text of the message. */
  readonly text: string;
  /** The embeddings of the message. Embeddings are used to determine the similarity between messages. */
  readonly embeddings?: number[];
}
