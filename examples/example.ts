import { Actor } from "../src/lib/Actor.js";
import { Conversation } from "../src//lib/Conversation.js";

// Create two actors for this conversation
const actors = [
  new Actor("Albert Einstein"),
  new Actor("Isaac Newton"),
];

// Create a conversation with the actors
const conversation = new Conversation("Debate", { actors });

// Set the topic of the debate
conversation.context.set("topic", "The topic of the debate", "gravity");

// Set the location of the debate
conversation.context.set(
  "location",
  "The location of the debate",
  "Metropolitan Museum of Art, New York",
);

// Set the date of the debate
conversation.context.set("date", "The date of the debate", "August 23, 1899");

// Set the time of the debate
conversation.context.set(
  "time",
  "The time of the debate",
  new Date().toTimeString(),
);

// Inject a message into the conversation
await conversation.inject(
  "Welcome to this debate. Please introduce yourselves.",
  {
    speaker: "Moderator", // The speaker of the message
    ephemeral: true, // Ephemeral messages are not saved in the history
  },
);

// Log the conversation history (the moderator's message should be there)
console.log(conversation.history.messages);

// It's the first speaker's turn to speak
const intro1 = await conversation.turn({
  speaker: actors[0], // The speaker of the message
  generateText: async () => ({ // A function that generates the text of the message
    text: "I am Albert Einstein",
  }),
});

// It's the second speaker's turn to speak
const intro2 = await conversation.turn({
  speaker: actors[1],
  generateText: async () => ({
    text: "I am Isaac Newton",
  }),
});

// Log the actors' introductions
console.log(`${intro1.speaker}: ${intro1.text}`);
console.log(`${intro2.speaker}: ${intro2.text}`);
console.log();

// Inject a message into the conversation (the actors' messages should be there)
console.log(conversation.history.messages);
