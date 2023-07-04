import { ConversationHistory } from "./ConversationHistory";
import { Actor, ContextData } from "./Actor";
import { IndexScheduler, Scheduler } from "./Scheduler";

/**
 * A response from the model. The response contains the text that the model
 * generated, and the embeddings of the text.
 */
export interface GenerateTextResult {
  /** The text that the model generated. */
  text: string;
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
  /** The embeddings of the text that the actor spoke. */
  embeddings?: number[];
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
  /** The scheduler of the conversation. */
  readonly scheduler: Scheduler;

  historyWindow: number | undefined;

  constructor(
    name: string,
    { actors, generateText, scheduler = IndexScheduler, messages, windows }: {
      actors: Actor[];
      generateText?: GenerateText;
      scheduler?: typeof Scheduler;
      messages?: Message[];
      windows?: {
        history?: number;
      };
    },
  ) {
    this.name = name;
    this.actors = actors;
    this.generateText = generateText;
    this.scheduler = new scheduler(this);

    if (messages?.length) {
      this.history.messages.push(...messages);
    }

    if (windows?.history) {
      if (windows.history < 0) {
        throw new Error("History window cannot be negative");
      }

      this.historyWindow = windows.history;
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
          for (const [name, data] of actor.context.entries()) {
            acc = { ...acc, [name]: data };
          }
          return acc;
        }, {} as Record<string, ContextData>);
      },
      /**
       * Add a new entry to the context. The entry is shared between all actors
       * in the conversation, and is used to store information about the
       * conversation.
       * @param name The name of the entry.
       * @param description A description of the entry.
       * @param value The value of the entry.
       * @param priority The priority of the entry. Entries with a higher
       * priority are preferred over entries with a lower priority.
       * @param embeddings The embeddings of the entry. Embeddings are used to
       * determine the similarity between entries.
       */
      add: (
        name: string,
        description: string,
        value: string,
        priority?: number,
        embeddings?: number[],
      ): void => {
        for (const actor of this.actors) {
          actor.context.set(name, {
            name,
            description,
            value,
            priority: priority ?? 0,
            embeddings,
          });
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
          actor.context.delete(name);
        }
      },
      /**
       * Get an entry from the context. The entry is shared between all actors
       * in the conversation, and is used to store information about the
       * conversation.
       * @param name The name of the entry.
       * @returns The entry.
       */
      get: (name: string): ContextData["value"] | undefined => {
        for (const actor of this.actors) {
          const data = actor.context.get(name);
          if (data) {
            return data.value;
          }
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
      store = false,
    }: {
      speaker: Actor | string;
      answerer: Actor;
      query: string;
      generateText?: GenerateText;
      store?: boolean;
    },
  ): Promise<TurnResponse> {
    if (!generateText) {
      throw new Error("No 'generateText' function provided");
    }

    const message: Omit<Message, "feedback"> = {
      actor: typeof speaker === "string" ? speaker : speaker.name,
      text: query,
      ephemeral: true,
    };

    this.history.push(message);

    const prompt = answerer.render(this);
    const { text, embeddings } = await generateText(prompt);

    this.history.cleanEphemeral();

    if (store) {
      this.history.push({
        actor: typeof speaker === "string" ? speaker : speaker.name,
        text: query,
      });
      this.history.push({ actor: answerer.name, text, embeddings });
    }

    return {
      speaker: typeof speaker === "string" ? speaker : speaker.name,
      actor: speaker instanceof Actor
        ? speaker
        : this.actors.find((actor) => actor.name === speaker),
      text,
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
   * @param embeddings The embeddings of the message. Embeddings are used to
   * determine the similarity between messages.
   * @param ephemeral Whether the message is ephemeral. By default the message
   * is not ephemeral.
   */
  inject(
    text: string,
    { speaker = "System", embeddings, ephemeral }: {
      speaker?: string | Actor;
      embeddings?: number[];
      ephemeral?: true;
    },
  ) {
    this.history.push({
      actor: typeof speaker === "string" ? speaker : speaker.name,
      text,
      embeddings,
      ephemeral,
    });
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
    const { text, embeddings } = await generateText(prompt);

    this.history.push({ actor: speaker.name, text, embeddings });
    this.history.cleanEphemeral();

    return {
      speaker: speaker.name,
      actor: speaker,
      text,
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
