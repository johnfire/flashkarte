import express from "express";
import request from "supertest";
import { createRegisterRouter } from "./register";
import { getRegisteredClient } from "./store";

function makeApp() {
  return express().use(express.json()).use(createRegisterRouter());
}

describe("POST /oauth/register", () => {
  test("registers a loopback client such as Claude Code", async () => {
    const res = await request(makeApp())
      .post("/oauth/register")
      .send({
        redirect_uris: ["http://localhost:4567/callback"],
        client_name: "Claude Code",
      });
    expect(res.status).toBe(201);
    expect(res.body.client_id).toMatch(/^dcr_[0-9a-f]{32}$/);
    expect(getRegisteredClient(res.body.client_id)).toMatchObject({
      redirect_uris: ["http://localhost:4567/callback"],
      client_name: "Claude Code",
    });
  });

  test.each([
    [["http://evil.example/cb"]],
    [["javascript:alert(1)"]],
    [[]],
    ["https://one.example/cb"],
  ])("rejects redirect_uris %p", async (redirect_uris) => {
    const res = await request(makeApp())
      .post("/oauth/register")
      .send({ redirect_uris });
    expect(res.status).toBe(400);
  });

  test("caps the stored client name", async () => {
    const res = await request(makeApp())
      .post("/oauth/register")
      .send({
        redirect_uris: ["https://app.example/cb"],
        client_name: "x".repeat(500),
      });
    expect(res.body.client_name).toHaveLength(100);
  });

  test("rate-limits registrations per IP", async () => {
    const app = makeApp();
    let last = 0;
    for (let i = 0; i < 12; i++) {
      const res = await request(app)
        .post("/oauth/register")
        .send({ redirect_uris: ["https://app.example/cb"] });
      last = res.status;
    }
    expect(last).toBe(429);
  });
});
