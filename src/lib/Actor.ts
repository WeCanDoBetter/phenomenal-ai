import { readFileSync } from "fs";
import { render } from "mustache";
import { Message } from "./Message";
import { reduce } from "../util";

const DEFAULT_TEMPLATE_URL = new URL(
  "../../templates/actor.mustache",
  __dirname,
);
const DEFAULT_TEMPLATE = readFileSync(DEFAULT_TEMPLATE_URL, "utf8");

/**
 * The data of an actor. The data is used to store information about the actor.
 */
export interface ActorData<Data = string> {
  /** The name of the data entry. */
  name: string;
  /** The value of the data entry. */
  value: Data;
  /** The description of the data entry. */
  description?: string;
  /** The priority of the data entry. Entries with a higher priority are
   * preferred over entries with a lower priority. */
  priority?: number;
  /** The embeddings of the data entry. Embeddings are used to determine the
   * similarity between entries. */
  embeddings?: number[];
}

export type ContextData = ActorData;
export type PersonaData = ActorData;
export type KnowledgeData = ActorData;
export type MemoryData = ActorData;
export type ConversationData = ActorData;

/**
 * The type of an actor. The type is used to categorize the actor.
 */
export enum PersonaType {
  /** A habit is a routine of behavior that is repeated regularly and tends to
   * occur subconsciously. */
  Habit = "habit",
  /** A trait is a distinguishing quality or characteristic, typically one
   * belonging to a person. */
  Trait = "trait",
  /** An interest is something that arouses curiosity or concern. */
  Interest = "interest",
  /** A goal is the object of a person's ambition or effort; an aim or desired
   * result. */
  Goal = "goal",
  /** A fear is an unpleasant emotion caused by the belief that someone or
   * something is dangerous, likely to cause pain, or a threat. */
  Fear = "fear",
  /** A desire is a strong feeling of wanting to have something or wishing for
   * something to happen. */
  Desire = "desire",
  /** A need is a physiological or psychological requirement for the well-being
   * of an organism. */
  Need = "need",
  /** A value is a person's principles or standards of behavior; one's
   * judgment of what is important in life. */
  Value = "value",
  /** A belief is an acceptance that a statement is true or that something
   * exists. */
  Belief = "belief",
  /** An identity is the fact of being who or what a person or thing is. */
  Identity = "identity",
  /** A role is an actor's portrayal of a character in a play, movie, or other
   * entertainment medium. */
  Role = "role",
  /** A relationship is the way in which two or more people or organizations
   * regard and behave toward each other. */
  Relationship = "relationship",
}

/**
 * The type of knowledge. The type is used to categorize the knowledge.
 */
export enum KnowledgeType {
  /** A fact is a thing that is known or proved to be true. */
  Fact = "fact",
  /** A skill is the ability to do something well; expertise. */
  Skill = "skill",
  /** An experience is practical contact with and observation of facts or
   * events. */
  Experience = "experience",
  /** An opinion is a view or judgment formed about something, not necessarily
   * based on fact or knowledge. */
  Opinion = "opinion",
  /** A belief is an acceptance that a statement is true or that something
   * exists. */
  Belief = "belief",
}

/**
 * The type of memory. The type is used to categorize the memory.
 */
export enum MemoryType {
  /** An event is a thing that happens, especially one of importance. */
  Event = "event",
  /** An experience is practical contact with and observation of facts or
   * events. */
  Experience = "experience",
  /** A conversation is a talk, especially an informal one, between two or more
   * people, in which news and ideas are exchanged. */
  Conversation = "conversation",
  /** A relationship is the way in which two or more people or organizations
   * regard and behave toward each other. */
  Relationship = "relationship",
}

export type ActorContext = Map<string, ContextData>;
export type ActorPersona = Map<PersonaType, PersonaData[]>;
export type ActorKnowledge = Map<KnowledgeType, KnowledgeData[]>;
export type ActorMemory = Map<MemoryType, MemoryData[]>;
export type ActorConversation = Message[];

/**
 * An actor is a person or other entity that performs a role in a conversation.
 * The actor is used to store information about the person or entity. The
 * information is used to determine the behavior of the actor.
 */
export class Actor {
  /**
   * Render the actor's prompt. The prompt is generated from the actor's
   * template. The prompt is generated using the actor's context, persona,
   * knowledge, memory, and messages.
   *
   * This method is a static method that can be used to render the prompt of an
   * actor without creating an instance of the actor.
   *
   * @param template The template to render with.
   * @param context The context of the actor.
   * @param persona The persona of the actor.
   * @param knowledge The knowledge of the actor.
   * @param memory The memory of the actor.
   * @param messages The messages to render with.
   */
  static render({ template, context, persona, knowledge, memory, messages }: {
    template: string;
    context: ActorContext;
    persona: ActorPersona;
    knowledge: ActorKnowledge;
    memory: ActorMemory;
    messages: Message[];
  }): string {
    return render(template, {
      context: reduce(context),
      persona: reduce(persona),
      knowledge: reduce(knowledge),
      memory: reduce(memory),
      messages,
    });
  }

  /** The unique identifier of the actor. */
  readonly id = crypto.randomUUID();
  /** The name of the actor. */
  readonly name: string;
  /** The prompt template for the actor. This template is used to generate the
   * prompt for the actor. */
  readonly template: string;
  /** The context of the actor. The context is used to store information about
   * the actor. */
  readonly context: ActorContext = new Map();
  /** The persona of the actor. The persona is used to store information about
   * the actor. */
  readonly persona: ActorPersona = new Map();
  /** The knowledge of the actor. The knowledge is used to store information
   * about the actor. */
  readonly knowledge: ActorKnowledge = new Map();
  /** The memory of the actor. The memory is used to store information about the
   * actor. */
  readonly memory: ActorMemory = new Map();

  /**
   * Creates a new actor. The actor is used to store information about the
   * person or entity. The information is used to determine the behavior of the
   * actor.
   *
   * @param name The name of the actor.
   * @param template The prompt template for the actor.
   * @param op Optional parameters.
   * @param op.context The context of the actor.
   * @param op.persona The persona of the actor.
   * @param op.knowledge The knowledge of the actor.
   * @param op.memory The memory of the actor.
   */
  constructor(name: string, template = DEFAULT_TEMPLATE, op?: {
    context?: Record<string, ContextData>;
    persona?: Partial<Record<PersonaType, PersonaData[]>>;
    knowledge?: Partial<Record<KnowledgeType, KnowledgeData[]>>;
    memory?: Partial<Record<MemoryType, MemoryData[]>>;
  }) {
    this.name = name;
    this.template = template;

    if (op?.context) {
      for (const [name, data] of Object.entries(op.context)) {
        this.context.set(name, {
          ...data,
          priority: data.priority ?? 0,
        });
      }
    }

    if (op?.persona) {
      for (const [type, data] of Object.entries(op.persona)) {
        this.persona.set(
          type as PersonaType,
          data.map((content) => ({
            ...content,
            priority: content.priority ?? 0,
          })),
        );
      }
    }

    if (op?.knowledge) {
      for (const [type, data] of Object.entries(op.knowledge)) {
        this.knowledge.set(
          type as KnowledgeType,
          data.map((content) => ({
            ...content,
            priority: content.priority ?? 0,
          })),
        );
      }
    }

    if (op?.memory) {
      for (const [type, data] of Object.entries(op.memory)) {
        this.memory.set(
          type as MemoryType,
          data.map((content) => ({
            ...content,
            priority: content.priority ?? 0,
          })),
        );
      }
    }
  }

  /**
   * Render the actor's prompt. The prompt is generated from the actor's
   * template. The prompt is generated using the actor's context, persona,
   * knowledge, memory, and messages.
   * @param messages The messages to render with.
   * @returns The rendered prompt.
   */
  render(messages: Message[]): string {
    return Actor.render({
      template: this.template,
      context: this.context,
      persona: this.persona,
      knowledge: this.knowledge,
      memory: this.memory,
      messages,
    });
  }
}
