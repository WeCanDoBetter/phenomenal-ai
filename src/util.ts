import type { Message } from "./lib/Conversation";

/**
 * Reduce a map to a record. Optionally sort the entries before reducing.
 * @param map The map to reduce
 * @param sort The sort function to use, if any
 * @returns A record of the map's entries
 */
export function reduce<T = unknown>(
  map: Map<string, T>,
  sort?: (a: T, b: T) => number,
): Record<string, T> {
  const entries = [...map.entries()];
  const sortedEntries = sort
    ? entries.sort((a, b) => sort(a[1], b[1]))
    : entries;

  return sortedEntries.reduce(
    (acc, [type, data]) => ({
      ...acc,
      [type]: data,
    }),
    {} as Record<string, T>,
  );
}

/**
 * Mask the messages in a conversation. Masking the messages in a conversation
 * removes the messages that are outside of the window. The window is the
 * maximum combined length of the embeddings of the messages. A heuristic is
 * used to approximate the length of the embeddings for messages that do not
 * have embeddings.
 * @param messages The messages to mask.
 * @param window The maximum combined length of the embeddings of the messages.
 * @returns The unmasked messages.
 */
export function mask(messages: Message[], window: number): Message[] {
  const unmasked: Message[] = [];
  let totalLength = 0;

  // a heuristic to approximate the length of the embeddings
  // based on OpenAI's notion that 1k tokens is roughly 750 words (3/4ths)
  const heuristic = (message: Message) =>
    Math.ceil(message.text.split(" ").length * 0.75);

  for (let i = messages.length - 1; i >= 0; i--) {
    const message = messages[i];
    const length = message.embeddings
      ? message.embeddings.length
      : heuristic(message);

    if (totalLength + length > window) {
      break;
    }

    unmasked.push(message);
    totalLength += length;
  }

  return unmasked.reverse();
}
