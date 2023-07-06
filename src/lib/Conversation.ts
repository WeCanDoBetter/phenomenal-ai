import { Actor, type ActorData } from "./Actor.js";
import { ConversationHistory } from "./ConversationHistory.js";
import { RoundRobinScheduler, Scheduler } from "./Scheduler.js";

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
  embeddings?: number[];
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
export type GenerateEmbeddings = (prompt: string) => Promise<number[]>;

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
  readonly embeddings?: number[];
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
  embeddings?: number[];
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
 * A conversation is a collection of actors that take turns speaking. The
 * conversation is responsible for keeping track of the history of the
 * conversation, and for providing a context to the actors. The context is
 * shared between all actors, and is used to store information about the
 * conversation.
 *
 * The conversation is also responsible for scheduling the turns of the actors.
 * The conversation can be configured with a scheduler, which is responsible for
 * determining which actor should speak next.
 *
 * @example
 * Create a conversation with two actors.
 *
 * ```ts
 * import { Actor, Conversation } from "@wecandobetter/phenomenal-ai";
 *
 * const conversation = new Conversation("My Conversation", {
 *  actors: [
 *    new Actor("Alice"),
 *    new Actor("Bob"),
 *  ],
 * });
 * ```
 */
export class Conversation {
  /** A unique identifier for the conversation. */
  readonly id = crypto.randomUUID();
  /** The name of the conversation. */
  readonly name: string;
  /** The actors in the conversation. */
  readonly actors: Actor[];
  /** The history of the conversation. */
  readonly history = new ConversationHistory();
  /** The function that generates text. */
  readonly generateText?: GenerateText;
  /** The function that generates tokens. */
  readonly generateTokens?: GenerateTokens;
  /** The function that generates embeddings. */
  readonly generateEmbeddings?: GenerateEmbeddings;
  /** The scheduler of the conversation. */
  readonly scheduler: Scheduler;

  /**
   * The context window size for the conversation. The context window is used to
   * determine the size of the prompt. The size of the prompt is determined by
   * the number of tokens.
   */
  window: number | ContextWindow | undefined;

  constructor(
    name: string,
    {
      actors,
      generateText,
      generateTokens,
      generateEmbeddings,
      scheduler = RoundRobinScheduler,
      messages,
      window,
    }: {
      actors: Actor[];
      generateText?: GenerateText;
      generateTokens?: GenerateTokens;
      generateEmbeddings?: GenerateEmbeddings;
      scheduler?: typeof Scheduler;
      messages?: Message[];
      window?: ContextWindow | number;
    },
  ) {
    this.name = name;
    this.actors = actors;
    this.generateText = generateText;
    this.generateTokens = generateTokens;
    this.generateEmbeddings = generateEmbeddings;
    this.scheduler = new scheduler(this);

    if (messages?.length) {
      this.history.messages.push(...messages);
    }

    if (typeof window !== "undefined") {
      const valid = (typeof window === "number" && window < 0) ||
        (typeof window === "object" && window.max < 0);

      if (!valid) {
        throw new Error("The context window must be a positive number.");
      }

      this.window = window;
    }
  }

  /**
   * The context of the conversation. The context is shared between all actors
   * in the conversation, and is used to store information about the
   * conversation.
   */
  get context() {
    return {
      /**
       * The entries in the context. The entries are shared between all actors
       * in the conversation, and are used to store information about the
       * conversation.
       * @returns The entries in the context.
       */
      entries: () => {
        return this.actors.reduce((acc, actor) => {
          for (const [name, data] of Object.entries(actor.context)) {
            acc = { ...acc, [name]: data };
          }
          return acc;
        }, {} as Record<string, ActorData[]>);
      },
      /**
       * Set an  entry on the context. The entry is shared between all actors
       * in the conversation, and is used to store information about the
       * conversation.
       * @param name The name of the entry.
       * @param description A description of the entry.
       * @param value The value of the entry.
       * @param priority The priority of the entry. Entries with a higher
       * priority are preferred over entries with a lower priority.
       * @param tokens The tokens of the entry. Tokens are used to calculate
       * the prompt size.
       * @param embeddings The embeddings of the entry. Embeddings are used to
       * determine the similarity between entries.
       * @param keep Whether to keep the entry in the context when truncating
       * the context window (default: `false`).
       */
      set: async (
        name: string,
        description: string,
        value: string,
        { priority, tokens = false, embeddings = false, keep }: {
          priority?: number;
          tokens?: number[] | boolean;
          embeddings?: number[] | boolean;
          keep?: boolean;
        } = {},
      ): Promise<void> => {
        for (const actor of this.actors) {
          const data: ActorData = {
            name,
            description,
            value,
            priority: priority ?? 0,
            tokens: Array.isArray(tokens)
              ? tokens
              : typeof tokens === "boolean" && tokens !== false
              ? await this.generateTokens?.(value)
              : undefined,
            embeddings: Array.isArray(embeddings)
              ? embeddings
              : typeof embeddings === "boolean" && embeddings !== false
              ? await this.generateEmbeddings?.(value)
              : undefined,
            keep,
          };

          const entry = actor.context[name] ?? [];
          entry.push(data);
          actor.context[name] = entry;
        }
      },
      /**
       * Remove an entry from the context. The entry is shared between all
       * actors in the conversation, and is used to store information about the
       * conversation.
       * @param name The name of the entry.
       */
      del: (name: string): void => {
        for (const actor of this.actors) {
          delete actor.context[name];
        }
      },
      /**
       * Get an entry from the context. The entry is shared between all actors
       * in the conversation, and is used to store information about the
       * conversation.
       * @param name The name of the entry.
       * @returns The entry.
       */
      get: (name: string): ActorData[] | undefined => {
        for (const actor of this.actors) {
          return actor.context[name];
        }
      },
    };
  }

  /**
   * Query the conversation. This allows an actor to ask a question to another
   * actor in the conversation. The speaker is the actor that is asking the
   * question, and the answerer is the actor that is being asked the question.
   * The query is the question that is being asked.
   *
   * The query doesn't have to be a question. It can be any text that the
   * answerer should respond or react to. The query is used as a prompt to
   * generate a response from the answerer.
   *
   * @param speaker The actor that is speaking.
   * @param answerer The actor that is being spoken to.
   * @param query The query to ask.
   * @param generateText A function that generates text given a prompt.
   * @param store Whether to store the response in the conversation history.
   * @returns The speaker and the response.
   */
  async query(
    {
      speaker,
      answerer,
      query,
      generateText = this.generateText,
      generateTokens = this.generateTokens,
      generateEmbeddings = this.generateEmbeddings,
      store = false,
    }: {
      speaker: Actor | string;
      answerer: Actor;
      query: string;
      generateText?: GenerateText;
      generateTokens?: GenerateTokens;
      generateEmbeddings?: GenerateEmbeddings;
      store?: boolean | {
        query?: boolean;
        response?: boolean;
      };
    },
  ): Promise<TurnResponse> {
    if (!generateText) {
      throw new Error("No 'generateText' function provided");
    }

    const ephemeral = typeof store === "boolean" ? !store : !store.query;

    const message = await this.buildMessage({
      speaker: typeof speaker === "string" ? speaker : speaker.name,
      text: query,
      tokens: false,
      embeddings: false,
      ephemeral,
    });

    this.history.push(message);

    const prompt = answerer.render(this);
    const { text, tokens, embeddings } = await generateText(prompt);

    if (ephemeral) {
      this.history.cleanEphemeral();
    }

    if (store === true || (store as { response?: boolean }).response === true) {
      this.history.push(
        await this.buildMessage({
          speaker: answerer.name,
          text,
          tokens: tokens ?? typeof generateTokens === "function",
          embeddings: embeddings ??
            typeof generateEmbeddings === "function",
        }),
      );
    }

    return {
      speaker: typeof speaker === "string" ? speaker : speaker.name,
      actor: speaker instanceof Actor
        ? speaker
        : this.actors.find((actor) => actor.name === speaker),
      text,
      prompt,
      tokens,
      embeddings,
    };
  }

  /**
   * Inject a message into the conversation. This allows an actor to inject a
   * message into the conversation. The message is used to update the history
   * of the conversation. The message can be ephemeral, which means that it
   * will be removed from the history after the next turn.
   * @param text The text of the message.
   * @param speaker The name of the actor that is speaking. If no speaker is
   * provided, the value will be `System`.
   * @param tokens The tokens of the message.
   * @param embeddings The embeddings of the message. Embeddings are used to
   * determine the similarity between messages.
   * @param ephemeral Whether the message is ephemeral. By default the message
   * is not ephemeral.
   */
  async inject(
    text: string,
    { speaker = "System", tokens, embeddings, ephemeral }: {
      speaker?: string | Actor;
      tokens?: number[] | boolean;
      embeddings?: number[] | boolean;
      ephemeral?: boolean;
    },
  ): Promise<Message> {
    const message = await this.buildMessage({
      speaker,
      text,
      tokens,
      embeddings,
      ephemeral,
    });

    this.history.push(message);
    return message;
  }

  /**
   * Turn the conversation. This allows an actor to speak in the conversation.
   * The actor is responsible for generating a response given the history of
   * the conversation. The response is used to update the history of the
   * conversation.
   *
   * @param speaker The actor that is speaking. If no speaker is provided, the
   * scheduler is used to determine which actor should speak next.
   * @param generateText A function that generates text given a prompt.
   * @returns The speaker and the response.
   */
  async turn(
    {
      speaker = this.scheduler.getNextSpeaker(),
      generateText = this.generateText,
    }: {
      speaker?: Actor;
      generateText?: GenerateText;
    },
  ): Promise<TurnResponse> {
    if (!generateText) {
      throw new TypeError("No 'generateText' function provided");
    }

    const prompt = speaker.render(this);
    const { text, tokens, embeddings } = await generateText(prompt);

    const message = await this.buildMessage({
      speaker,
      text,
      tokens,
      embeddings,
    });

    this.history.push(message);
    this.history.cleanEphemeral();

    return {
      speaker: message.actor,
      text,
      prompt,
      tokens,
      embeddings,
    };
  }

  /**
   * Loop the conversation. The scheduler is used to determine which actor
   * should speak next. The conversation is aborted when the signal is aborted.
   *
   * @param signal The signal to abort the conversation.
   * @param generateText A function that generates text given a prompt.
   * @param scheduler The scheduler to determine which actor should speak next. If
   * no scheduler is provided, the conversation scheduler is used.
   * @returns The speaker and the response.
   */
  async *loop(
    { signal, generateText = this.generateText, scheduler = this.scheduler }: {
      signal: AbortSignal;
      generateText?: GenerateText;
      scheduler?: Scheduler;
    },
  ): AsyncGenerator<TurnResponse> {
    if (!generateText) {
      throw new TypeError("No 'generateText' function provided");
    }

    if (scheduler.conversation !== this) {
      throw new TypeError(
        "The scheduler is not associated with this conversation.",
      );
    }

    while (!signal.aborted) {
      yield this.turn({
        speaker: scheduler.getNextSpeaker(),
        generateText,
      });
    }
  }

  /**
   * Build a message. This allows an actor to build a message that can be
   * injected into the conversation. The message is used to update the history
   * of the conversation. The message can be ephemeral, which means that it
   * will be removed from the history after the next turn.
   * @param speaker The name of the actor that is speaking.
   * @param text The text of the message.
   * @param tokens The tokens of the message. If no tokens are provided, the
   * tokens will be generated from the text (if a `generateTokens` function is
   * provided).
   * @param embeddings The embeddings of the message. Embeddings are used to
   * determine the similarity between messages. If no embeddings are provided,
   * the embeddings will be generated from the text (if a `generateEmbeddings`
   * function is provided).
   * @param ephemeral Whether the message is ephemeral. By default the message
   * is not ephemeral.
   * @param feedback The feedback of the message.
   * @param generateTokens A function that generates tokens given a text.
   * @param generateEmbeddings A function that generates embeddings given a
   * text.
   * @returns The message.
   */
  async buildMessage(
    { speaker, text, tokens, embeddings, ephemeral, feedback }: {
      speaker: Actor | string;
      text: string;
      tokens?: number[] | boolean;
      embeddings?: number[] | boolean;
      feedback?: [up: number, down: number];
      ephemeral?: boolean;
    },
    {
      generateTokens = this.generateTokens,
      generateEmbeddings = this.generateEmbeddings,
    }: {
      generateTokens?: GenerateTokens;
      generateEmbeddings?: GenerateEmbeddings;
    } = {},
  ): Promise<Message> {
    return {
      actor: typeof speaker === "string" ? speaker : speaker.name,
      text,
      tokens: ephemeral
        ? undefined
        : Array.isArray(tokens)
        ? tokens
        : tokens === true
        ? await generateTokens?.(text)
        : undefined,
      embeddings: ephemeral
        ? undefined
        : Array.isArray(embeddings)
        ? embeddings
        : embeddings === true
        ? await generateEmbeddings?.(text)
        : undefined,
      ephemeral: ephemeral === true,
      feedback: feedback ?? [0, 0],
    };
  }

  /**
   * Transform the conversation to a JSON-seriazable object.
   */
  toJSON() {
    return {
      actors: this.actors.map((actor) => actor.toJSON()),
      history: this.history.toJSON(),
      scheduler: this.scheduler.toJSON(),
    };
  }
}
