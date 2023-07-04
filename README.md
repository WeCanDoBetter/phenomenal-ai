# Phenomenal AI

[![npm version](https://badge.fury.io/js/%40wecandobetter%2Fphenomenal-ai.svg)](https://badge.fury.io/js/%40wecandobetter%2Fphenomenal-ai)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

**Phenomenal AI** is a TypeScript package for building a turn-based
conversational prompt generator for large language models. This package provides
the building blocks for simulating conversational interactions between multiple
entities, referred to as actors. Actors can share information, engage in
dialogue, and dynamically adjust the course of conversation based on predefined
rules.

The `Conversation` class encapsulates all actors and manages the history,
context and the scheduling of actor's turns.

## 📌 Features

- 🎭 **Multiple Actors**: This package supports interaction between multiple
  actors, allowing for complex conversational scenarios. Each actor can have
  their own personality and preferences.
- 📚 **Conversation History**: Every conversation has a history which tracks the
  course of dialogue over time. The history is used to generate responses to new
  lines of dialogue.
- 💾 **Shared Context**: Actors in a conversation share a context that allows
  them to store and retrieve information relevant to the ongoing discussion. The
  context can be used to store information such as the topic of conversation,
  the location, the time of day, etc.
- 🔄 **Scheduling**: The package provides a mechanism to decide the order of
  turns between the actors using schedulers. The package comes with a default
  scheduler that schedules turns in a round-robin fashion.
- 🎬 **Conversation Turn Management**: Controls the turn flow of the
  conversation and provides a method to inject new messages into the
  conversation. The package also provides a method to query the conversation
  with a question and get a response.
- 📜 **Context Window Management**: The package provides a mechanism to manage
  the context window. The context window is the number of tokens to unmask in
  the history when generating a response. This allows you to control the prompt
  size and the amount of context provided to the model.
- ✨ **High-Level Abstraction**: Phenomenal AI provides a high level of
  abstraction for AI-based conversation models. This allows you to focus on the
  conversation logic and not the underlying model.
- 📝 **TypeScript**: The package is written in TypeScript and provides type
  definitions.
- 📦 **Lightweight**: The package has only one external dependency (`mustache`),
  making it lightweight and easy to use.
- 🧪 **Extensible**: The package is designed to be extensible. You can provide
  your own text generation function, scheduler, etc.

## 🏁 Getting Started

You can install the package via npm:

```bash
npm install @wecandobetter/phenomenal-ai
```

Or via yarn:

```bash
yarn add @wecandobetter/phenomenal-ai
```

## 🚀 Usage Examples

```typescript
import { Actor, Conversation } from "@wecandobetter/phenomenal-ai";
import { generateText } from "./text-generation"; // provide your own text generation function

// Define your actors
let actors: Actor[] = [
  new Actor("John"),
  new Actor("Emma"),
];

// Initialize a conversation
const conversation = new Conversation("Morning Talk", { actors });

// Add a context entry
conversation.context.add("topic", "Current topic of conversation", "AI Ethics");

// Make a query:

const response = await conversation.query({
  speaker: actors[0], // the speaker, i.e. the actor asking the question
  answerer: actors[1], // the answerer, i.e. the actor answering the question
  query: "What is the topic of conversation?", // the query to be answered
  generateText, // provide your own text generation function
  store: true, // store the response in the history
});

console.log(`${response.speaker.name}: ${response.text}`);

// Moderate the conversation by injecting a new message:

conversation.inject("Let's get back to the topic of conversation.", {
  speaker: "Moderator",
  ephemeral: true, // this message will not be stored in the history
});

// Make one turn:

const turn = await conversation.turn({
  actor: conversation.scheduler.getNextSpeaker(), // get the next speaker from the scheduler
  generateText, // provide your own text generation function
});

console.log(`${turn.speaker.name}: ${turn.text}`);

// or use an async generator:

const ac = new AbortController();

for await (
  const turn of conversation.loop({
    signal: ac.signal, // provide an AbortSignal to stop the loop
    generateText, // provide your own text generation function
  })
) {
  console.log(`${turn.speaker.name}: ${turn.text}`);
}
```

## 📚 API Reference

The main classes of this package are `Conversation` and `Actor`.

### Conversation

The `Conversation` class represents an ongoing conversation between multiple
actors.

#### Properties

- `id`: Unique identifier for the conversation.
- `name`: Name of the conversation.
- `actors`: Array of Actors participating in the conversation.
- `history`: The history of the conversation.
- `context`: Shared context between all actors in the conversation.

#### Methods

These are the methods available on the `Conversation` class.

##### `new Conversation(name: string, { actors: Actor[], generateText?: GenerateText, scheduler?: Scheduler, messages?: Message[], widnows?: { history?: number } })`

Initializes a new instance of the `Conversation` class.

```typescript
const conversation = new Conversation("Morning Talk", {
  actors: [
    new Actor("John"),
    new Actor("Emma"),
  ],
  generateText: generateText, // provide your own text generation function
  scheduler: IndexScheduler, // provide your own scheduler
  messages: [], // bootstrap the conversation with messages
  window: { // configure the conversation window
    history: 1024, // the maximum number of tokens to unmask in the history
  },
});
```

##### `conversation.inject(text: string, { speaker?: string, embeddings?: number[], ephemeral?: true })`

Injects a new message into the conversation. Returns the injected message.

```typescript
const message = conversation.inject(
  "Let's get back to the topic of conversation.",
  {
    speaker: "Moderator",
    ephemeral: true, // this message will not be stored in the history
  },
);
```

##### `conversation.query({ speaker: Actor, answerer: Actor, query, generateText: GenerateText, store = false })`

Returns a promise that resolves to a turn response.

```typescript
const response = await conversation.query({
  speaker: actors[0], // the speaker, i.e. the actor asking the question
  answerer: actors[1], // the answerer, i.e. the actor answering the question
  query: "What is the topic of conversation?", // the query to be answered
  generateText, // provide your own text generation function
  store: true, // store the response in the history
});

console.log(`${response.speaker.name}: ${response.text}`);
```

##### `conversation.turn({ generateText: GenerateText })`

Returns a promise that resolves to a turn response.

```typescript
const response = await conversation.turn({
  actor: conversation.scheduler.getNextSpeaker(), // get the next speaker from the scheduler
  generateText, // provide your own text generation function
});

console.log(`${response.speaker.name}: ${response.text}`);
```

##### `conversation.loop({ signal: AbortSignal; generateText: GenerateText })`

An async generator that yields the speaker, the text, and optionally the
embeddings of each turn in the conversation.

```typescript
const ac = new AbortController();

// start the loop, which will yield the responses
const loop = conversation.loop({
  signal: ac.signal, // provide an AbortSignal to stop the loop
  generateText, // provide your own text generation function
});

for await (const response of loop) {
  console.log(`${response.speaker.name}: ${response.text}`);
}
```

##### `conversation.toJSON()`

Returns a JSON representation of the conversation.

```typescript
const json = conversation.toJSON();
```

### ConversationHistory

The `ConversationHistory` class represents the history of a conversation.

#### Properties

- `messages`: Array of messages in the conversation.

#### Methods

These are the methods available on the `ConversationHistory` class.

##### `new ConversationHistory(messages?: Message[])`

Initializes a new instance of the `ConversationHistory` class.

```typescript
const history = new ConversationHistory([
  { actor: "John", text: "Hello, Emma!" },
  { actor: "Emma", text: "Hi, John!" },
]);
```

##### `history.push(message: PartialBy<Message, "feedback">)`

Pushes a new message to the history.

```typescript
history.push({ actor: "John", text: "Hello, Emma!" });
```

##### `history.getMessagesFor(actor: string)`

Returns an map of indexes and messages for the given actor.

```typescript
const messages = history.getMessagesFor("John");
```

##### `history.getStats()`

Returns statistics about the history.

```typescript
const stats = history.getStats();
```

##### `history.cleanEphemeral()`

Removes ephemeral messages from the history.

```typescript
history.cleanEphemeral();
```

##### `history.up(message: Message)`

Add positive feedback to the given message.

```typescript
const message = history.messages[0]; // get message from somewhere
history.up(message);
```

##### `history.down(message: Message)`

Add negative feedback to the given message.

```typescript
const message = history.messages[0]; // get message from somewhere
history.down(message);
```

##### `history.first(): Message`

Returns the first message in the history.

##### `history.last(): Message`

Returns the last message in the history.

##### `history.toJSON()`

Returns a JSON representation of the history.

#### `history.clear()`

Clears the history.

### Actor

The `Actor` class represents an entity that is taking part in a conversation.

#### Properties

- `id`: Unique identifier for the actor.
- `name`: Name of the actor.
- `template`: Template for the actor's prompts.
- `context`: Shared context between all actors in the conversation.
- `persona`: Persona of the actor.
- `knowledge`: Knowledge of the actor.
- `memory`: Memory of the actor.

#### Methods

These are the methods available on the `Actor` class.

##### `new Actor(name: string, { template?: string, persona?: Persona, knowledge?: Knowledge, memory?: Memory })`

Initializes a new instance of the `Actor` class.

```typescript
const actor = new Actor("John", {
  template: "Hello, my name is {{name}}.",
);
```

##### `actor.render(conversation: Conversation)`

Renders the actor's template into a prompt. The prompt is a message that can be
used by your chosen large language model to generate a response.

```typescript
const prompt = actor.render(conversation);
```

##### `actor.toJSON()`

Returns a JSON representation of the actor.

## ❤️ Contributing

Pull requests are welcome. For major changes, please open an issue first to
discuss what you would like to change. Feel free to check
[issues page](https://github.com/wecandobetter/phenomenal-ai/issues).

## 📜 License

This project is licensed under the MIT License.

## 🙏 Last Notes

Happy coding! 😊 If you encounter any problems or have suggestions for
improvements, feel free to open an issue or a pull request.

Give a ⭐️ if you like this project!

Coded with ❤️ by [We Can Do Better](https://wcdb.life).
