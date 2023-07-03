import { ConversationHistory } from "./ConversationHistory";
import { Actor, ContextData } from "./Actor";
import { IndexScheduler, Scheduler } from "./Scheduler";

/**
 * Response from an actor's turn. The response contains the actor that spoke,
 * and the text that they spoke.
 */
export interface TurnResponse {
  /** The actor that spoke. */
  speaker: Actor;
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
  /** The scheduler of the conversation. */
  readonly scheduler: Scheduler;

  constructor(name: string, actors: Actor[], scheduler?: typeof Scheduler) {
    this.name = name;
    this.actors = actors;
    this.scheduler = new (scheduler ?? IndexScheduler)(this);
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
  async query({ speaker, answerer, query, generateText, store = false }: {
    speaker: Actor;
    answerer: Actor;
    query: string;
    generateText: (prompt: string) => Promise<string>;
    store?: boolean;
  }): Promise<TurnResponse> {
    const message = {
      actor: speaker.name,
      text: query,
    };

    const prompt = answerer.render([
      ...this.history.messages,
      message,
    ]);

    const text = await generateText(prompt);

    if (store) {
      this.history.push(speaker.name, query);
      this.history.push(answerer.name, text);
    }

    return { speaker, text };
  }

  /**
   * Turn the conversation. The conversation is responsible for scheduling the
   * turns of the actors. The conversation can be configured with a scheduler,
   * which is responsible for determining which actor should speak next.
   *
   * The conversation is also responsible for keeping track of the history of
   * the conversation, and for providing a context to the actors. The context is
   * shared between all actors, and is used to store information about the
   * conversation.
   *
   * @param options The options for turning the conversation.
   * @param options.generateText A function that generates text given a prompt.
   * @returns The speaker and the response.
   */
  async turn({ generateText }: {
    generateText: (prompt: string) => Promise<string>;
  }): Promise<TurnResponse> {
    const speaker = this.scheduler.getNextSpeaker();
    const prompt = speaker.render(this.history.messages);
    const text = await generateText(prompt);

    this.history.push(speaker.name, text);
    return { speaker, text };
  }

  /**
   * Turn the conversation in a loop. The conversation is responsible for
   * scheduling the turns of the actors. The conversation can be configured with
   * a scheduler, which is responsible for determining which actor should speak
   * next.
   *
   * The conversation is also responsible for keeping track of the history of
   * the conversation, and for providing a context to the actors. The context is
   * shared between all actors, and is used to store information about the
   * conversation.
   *
   * @param options The options for turning the conversation.
   * @param options.signal The signal to abort the conversation.
   * @param options.generateText A function that generates text given a prompt.
   * @returns An async generator that yields the speaker and the response.
   */
  async *loop({ signal, generateText }: {
    signal: AbortSignal;
    generateText: (prompt: string) => Promise<string>;
  }) {
    while (!signal.aborted) {
      yield this.turn({ generateText });
    }
  }
}
