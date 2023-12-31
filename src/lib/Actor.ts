import { default as mustache } from "mustache";
import type {
  ActorContext,
  ActorData,
  ActorKnowledge,
  ActorMemory,
  ActorPersona,
  Message,
} from "../types.js";
import { Conversation } from "./Conversation.js";
import { buildWindow, loadTemplate, reduce } from "../util.js";

/**
 * The default template for an actor. The template is used to render the actor
 * prompt.
 */
const DEFAULT_TEMPLATE = await loadTemplate("actor");

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
  /** A role is an actor's role in the context of a conversation. */
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
   * @param name The name of the actor.
   * @param template The template to render with.
   * @param participants The perticipants in the conversation.
   * @param context The context of the actor.
   * @param persona The persona of the actor.
   * @param knowledge The knowledge of the actor.
   * @param memory The memory of the actor.
   * @param messages The messages to render with.
   */
  static render(
    {
      name,
      conversation,
      actor,
      template,
      participants,
      context,
      persona,
      knowledge,
      memory,
      messages,
    }: {
      name: string;
      conversation: {
        id: string;
        name: string;
      };
      actor: Actor;
      template: string;
      participants?: Actor[];
      context: ActorData[];
      persona: ActorData[];
      knowledge: ActorData[];
      memory: ActorData[];
      messages: Message[];
    },
  ): string {
    return mustache.render(template, {
      name,
      conversation,
      actor,
      participants,
      context,
      persona,
      knowledge,
      memory,
      messages,
    });
  }

  /** The unique identifier of the actor. */
  readonly id;
  /** The name of the actor. */
  readonly name: string;
  /** The prompt template for the actor. This template is used to generate the
   * prompt for the actor. */
  readonly template: string;
  /** The context of the actor. The context is used to store information about
   * the actor. */
  readonly context: ActorContext = {};
  /** The persona of the actor. The persona is used to store information about
   * the actor. */
  readonly persona: ActorPersona = {};
  /** The knowledge of the actor. The knowledge is used to store information
   * about the actor. */
  readonly knowledge: ActorKnowledge = {};
  /** The memory of the actor. The memory is used to store information about the
   * actor. */
  readonly memory: ActorMemory = {};

  /**
   * Creates a new actor. The actor is used to store information about the
   * person or entity. The information is used to determine the behavior of the
   * actor.
   *
   * @param name The name of the actor.
   * @param template The prompt template for the actor. If not provided, the
   * default template is used.
   * @param context The context of the actor.
   * @param persona The persona of the actor.
   * @param knowledge The knowledge of the actor.
   * @param memory The memory of the actor.
   */
  constructor(
    name: string,
    {
      id = crypto.randomUUID(),
      template = DEFAULT_TEMPLATE,
      context,
      persona,
      knowledge,
      memory,
    }: {
      id?: string;
      template?: string;
      context?: Record<string, ActorData[]>;
      persona?: Partial<Record<PersonaType, ActorData[]>>;
      knowledge?: Partial<Record<KnowledgeType, ActorData[]>>;
      memory?: Partial<Record<MemoryType, ActorData[]>>;
    } = {},
  ) {
    this.id = id;
    this.name = name;
    this.template = template;

    if (context) {
      for (const [name, data] of Object.entries(context)) {
        this.context[name] = data;
      }
    }

    if (persona) {
      for (const [type, data] of Object.entries(persona)) {
        this.persona[type as PersonaType] = data;
      }
    }

    if (knowledge) {
      for (const [type, data] of Object.entries(knowledge)) {
        this.knowledge[type as KnowledgeType] = data;
      }
    }

    if (memory) {
      for (const [type, data] of Object.entries(memory)) {
        this.memory[type as MemoryType] = data;
      }
    }
  }

  /**
   * Render the actor's prompt. The prompt is generated from the actor's
   * template. The prompt is generated using the actor's context, persona,
   * knowledge, memory, and the message history of the conversation.
   * @param conversation The conversation to render with.
   * @returns The rendered prompt.
   */
  render(conversation: Conversation): string {
    const context = {
      context: this.context,
      persona: this.persona,
      knowledge: this.knowledge,
      memory: this.memory,
    };

    const window = conversation.window
      ? buildWindow(
        context,
        typeof conversation.window === "object"
          ? conversation.window.max
          : conversation.window,
      )
      : {
        context: Object.values(this.context).flat(),
        persona: Object.values(this.persona).flat(),
        knowledge: Object.values(this.knowledge).flat(),
        memory: Object.values(this.memory).flat(),
      };

    return Actor.render({
      name: this.name,
      conversation: conversation,
      actor: this,
      participants: conversation.actors.filter((actor) => actor !== this),
      template: this.template,
      context: window.context,
      persona: window.persona,
      knowledge: window.knowledge,
      memory: window.memory,
      messages: conversation.history.messages,
    });
  }

  /**
   * Transform the actor into a JSON-seralizable object.
   */
  toJSON() {
    return {
      id: this.id,
      name: this.name,
      template: this.template,
      context: reduce(this.context),
      persona: reduce(this.persona),
      knowledge: reduce(this.knowledge),
      memory: reduce(this.memory),
    };
  }
}
