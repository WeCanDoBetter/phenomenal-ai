import { readFile } from "fs/promises";
import { ActorData } from "./lib/Actor.js";
import type { Message } from "./lib/Conversation.js";

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

  for (let i = messages.length - 1; i >= 0; i--) {
    const message = messages[i];
    const length = message.embeddings
      ? message.embeddings.length
      : heuristic(message.text);

    if (totalLength + length > window) {
      break;
    }

    unmasked.push(message);
    totalLength += length;
  }

  return unmasked.reverse();
}

/**
 * Get the dot product of two vectors.
 * @param x The first vector.
 * @param y The second vector.
 * @returns The dot product of the two vectors.
 */
export function dotProduct(x: number[], y: number[]): number {
  return x.map((value, index) => value * y[index]).reduce((a, b) => a + b, 0);
}

/**
 * Get the cosine similarity of two vectors. The cosine similarity is a measure
 * of similarity between two vectors. The similarity value is a number between
 * -1 and 1. A value of 1 means the vectors are identical. A value of -1 means
 * the vectors are opposite. A value of 0 means the vectors are orthogonal.
 * @param a The first vector.
 * @param b The second vector.
 * @returns The cosine similarity of the two vectors.
 */
export function cosineSimilarity(a: number[], b: number[]): number {
  const dotProductAB = dotProduct(a, b);
  const magnitudeA = Math.sqrt(dotProduct(a, a));
  const magnitudeB = Math.sqrt(dotProduct(b, b));
  const similarity = dotProductAB / (magnitudeA * magnitudeB);
  return similarity;
}

/**
 * Get the approximate length of a text. This method is used when a text
 * does not have tokens. The heuristic is based on OpenAI's notion that
 * 1k tokens is roughly 750 words (3/4ths).
 */
export function heuristic(text: string) {
  return Math.ceil(text.split(" ").length * 0.75);
}

export interface IndexedActorData extends ActorData {
  section: string;
  type: string;
  index: number;
}

/**
 * Build a window of values. The window is built by adding values in order
 * until the maximum number of tokens is reached. The values are sorted by
 * `keep` (true first), then by `priority` (high first), then by index
 * (low first). Then the values are sorted by the original index, so that
 * the values are returned in the original order.
 * @param inputValues The values to build the window from
 * @param maxTokens The maximum number of tokens in the window
 * @returns The values in the window in the original order
 */
export function buildWindow(
  inputValues: Record<string, Map<string, ActorData[]>>,
  maxTokens: number,
): Record<string, Record<string, ActorData[]>> {
  let currentTokens = 0;
  const sortedValues: IndexedActorData[] = [];

  // Add an index, section and type to each value
  for (const section in inputValues) {
    const typeMap = inputValues[section];
    typeMap.forEach((values, type) => {
      values.forEach((value, index) => {
        sortedValues.push({
          ...value,
          index,
          section,
          type,
        });
      });
    });
  }

  // Sort values by keep (true first), then by priority (high first), then by index (low first)
  sortedValues.sort((a, b) => {
    if (a.keep !== b.keep) return a.keep ? -1 : 1;
    if (a.priority !== b.priority) return (b.priority ?? 0) - (a.priority ?? 0);
    return b.index - a.index;
  });

  // Process values in the sorted order and build the output map
  const orderedValues: Record<string, Record<string, IndexedActorData[]>> = {};

  for (const value of sortedValues) {
    const tokenLength = value.tokens?.length ?? heuristic(value.value);
    if (currentTokens + tokenLength > maxTokens) {
      break;
    }

    if (!orderedValues[value.section]) {
      orderedValues[value.section] = {};
    }

    if (!orderedValues[value.section][value.type]) {
      orderedValues[value.section][value.type] = [];
    }

    orderedValues[value.section][value.type].push(value);
    currentTokens += tokenLength;
  }

  const outputValues: Record<string, Record<string, ActorData[]>> = {};

  // Re-sort each type list by the original index and remove the index, section, and type properties
  for (const section in orderedValues) {
    for (const type in orderedValues[section]) {
      if (!outputValues[section]) {
        outputValues[section] = {};
      }

      outputValues[section][type] = orderedValues[section][type].sort((a, b) =>
        a.index - b.index
      ).map(({ index, section, type, ...rest }) => rest);
    }
  }

  return outputValues;
}

/**
 * Load a prompt template from the templates directory.
 * @param name The name of the template to load
 * @returns The template as a string
 */
export function loadTemplate(name: string): Promise<string> {
  const url = new URL(`../templates/${name}.mustache`, import.meta.url);
  return readFile(url, "utf8");
}
