import { expect } from "chai";
import { Actor } from "../src/lib/Actor";

describe("Actor", () => {
  let actor: Actor;

  it("should create a new Actor", () => {
    actor = new Actor("Bob");
    expect(actor).to.be.an.instanceOf(Actor);
  });

  it("should have a name", () => {
    expect(actor.name).to.equal("Bob");
  });
});
