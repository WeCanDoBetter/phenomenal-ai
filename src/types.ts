import type { Actor } from "./lib/Actor.js";

/**
 * The data of an actor. The data is used to store information about the actor.
 */
export interface ActorData<Data = string> {
  /** The name of the data entry. */
  name: string;
  /** The type of the data entry. */
  type: string;
  /** The value of the data entry. */
  value: Data;
  /** The description of the data entry. */
  description?: string;
  /** The priority of the data entry. Entries with a higher priority are
   * preferred over entries with a lower priority. */
  priority?: number;
  /** The tokens of the data entry. Tokens can be used to calculate the
   * prompt size. */
  tokens?: number[];
  /** The embeddings of the data entry. Embeddings are used to determine the
   * similarity between entries. */
  embeddings?: Embeddings;
  /** Whether to keep the data entry when truncating the context window. */
  keep?: boolean;
}

/**
 * The context of an actor. The context is used to store information about the
 * actor's environment. The context is used to determine the behavior of the
 * actor. The context is used to generate the actor's prompt.
 */
export type ActorContext = Record<string, ActorData[]>;

/**
 * The persona of an actor. The persona is used to store information about the
 * actor's personality. The persona is used to determine the behavior of the
 * actor. The persona is used to generate the actor's prompt.
 */
export type ActorPersona = Record<string, ActorData[]>;

/**
 * The knowledge of an actor. The knowledge is used to store information about
 * the actor's knowledge. The knowledge is used to determine the behavior of
 * the actor. The knowledge is used to generate the actor's prompt.
 */
export type ActorKnowledge = Record<string, ActorData[]>;

/**
 * The memory of an actor. The memory is used to store information about the
 * actor's memory. The memory is used to determine the behavior of the actor.
 * The memory is used to generate the actor's prompt.
 */
export type ActorMemory = Record<string, ActorData[]>;

/**
 * Embeddings are used to determine the similarity between messages.
 */
export type Embeddings = number[][];

/**
 * A response from the model. The response contains the text that the model
 * generated, and the embeddings of the text.
 */
export interface GenerateTextResult {
  /** The text that the model generated. */
  text: string;
  /** The tokens of the text that the model generated. */
  tokens?: number[];
  /** The embeddings of the text that the model generated. */
  embeddings?: Embeddings;
}

/**
 * A function that generates text given a prompt.
 * @param prompt The prompt to generate text from.
 * @returns The generated text with optional embeddings.
 */
export type GenerateText = (prompt: string) => Promise<GenerateTextResult>;

/**
 * A function that generates tokens given a prompt.
 * @param prompt The prompt to generate tokens from.
 * @returns The generated tokens.
 */
export type GenerateTokens = (prompt: string) => Promise<number[]>;

/**
 * A function that generates embeddings given a prompt. Embeddings are used to
 * determine the similarity between messages.
 * @param prompt The prompt to generate embeddings from.
 * @returns The generated embeddings.
 */
export type GenerateEmbeddings = (prompt: string) => Promise<Embeddings>;

/**
 * A message in a conversation. Messages are used to communicate between actors
 * in a conversation. Messages are immutable.
 */
export interface Message {
  /** The actor that sent the message. */
  readonly actor: string;
  /** The text of the message. */
  readonly text: string;
  /** The feedback of the message. Feedback is used to fine-tune the model. */
  readonly feedback: [up: number, down: number];
  /** The tokens of the message. Tokens can be used to calculate the prompt size. */
  readonly tokens?: number[];
  /** The embeddings of the message. Embeddings are used to determine the similarity between messages. */
  readonly embeddings?: Embeddings;
  /** Whether the message is ephemeral. Ephemeral messages are removed from the history after a turn. */
  readonly ephemeral?: boolean;
}

/**
 * Response from an actor's turn. The response contains the actor that spoke,
 * and the text that they spoke.
 */
export interface TurnResponse {
  /** The speaker of the turn. */
  speaker: string;
  /** The actor that spoke. */
  actor?: Actor;
  /** The text that the actor spoke. */
  text: string;
  /** The prompt used to generate the text. */
  prompt: string;
  /** The tokens of the text that the actor spoke. */
  tokens?: number[];
  /** The embeddings of the text that the actor spoke. */
  embeddings?: Embeddings;
}

/**
 * The context window is used to determine the size of the prompt. The size of
 * the prompt is determined by the number of tokens in the context window.
 */
export interface ContextWindow {
  /** The maximum number of tokens in the prompt. */
  max: number;
}

/**
 * Make some properties of an object optional.
 */
export type PartialBy<T, K extends keyof T> = Omit<T, K> & Partial<Pick<T, K>>;
