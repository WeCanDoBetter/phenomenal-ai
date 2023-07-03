# @wecandobetter/phenomenal-ai

Phenomenal AI is a TypeScript package for building a turn-based conversational
prompt generator for large language models. This package provides the building
blocks for simulating conversational interactions between multiple entities,
referred to as actors. Actors can share information, engage in dialogue, and
dynamically adjust the course of conversation based on predefined rules.

The `Conversation` class encapsulates all actors and manages the history,
context and the scheduling of actor's turns.

## 📌 Features

- 🎭 **Multiple Actors**: This package supports interaction between multiple
  actors, allowing for complex conversational scenarios.
- 📚 **Conversation History**: Every conversation has a history which tracks the
  course of dialogue over time.
- 💾 **Shared Context**: Actors in a conversation share a context that allows
  them to store and retrieve information relevant to the ongoing discussion.
- 🔄 **Scheduling**: The package provides a mechanism to decide the order of
  turns between the actors using schedulers.
- 🎬 **Conversation Turn Management**: Controls the turn flow of the
  conversation and provides a method to add new messages to the conversation.
- ✨ **Abstraction**: It provides a higher level of abstraction for AI-based
  conversation models.

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
let conversation = new Conversation("Morning Talk", actors);

// Add a context entry
conversation.context.add("topic", "Current topic of conversation", "AI Ethics");

// Make one turn:

const turn = await conversation.turn({
  generateText, // provide your own text generation function
});

console.log(`${turn.speaker.name}: ${turn.response}`);

// or use an async generator:

const ac = new AbortController();

for await (
  const turn of conversation.loop({
    signal: ac.signal,
    generateText, // provide your own text generation function
  })
) {
  console.log(`${turn.speaker.name}: ${turn.response}`);
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

- `constructor(name: string, actors: Actor[])`: Initializes a new instance of
  the Conversation class.
- `push(actor: string, text: string)`: Add a new message to the history.
- `turn(options: { generateText: (prompt: string) => Promise<string>; })`:
  Returns a promise that resolves to the speaker and the response.
- `loop(options: { signal: AbortSignal; generateText: (prompt: string) => Promise<string>; })`:
  An async generator that yields the speaker and the response.

### Actor

The `Actor` class represents an entity that is taking part in a conversation.
See source files for more details.

## ❤️ Contributing

Pull requests are welcome. For major changes, please open an issue first to
discuss what you would like to change. Feel free to check
[issues page](https://github.com/wecandobetter/phenomenal-ai/issues).

## 📜 License

This project is licensed under the MIT License.

## 🙏 Last Notes

Give a ⭐️ if you like this project!

Coded with ❤️ by [We Can Do Better](https://wcdb.life).
