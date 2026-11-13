// Vercel serverless entry point (optional path).
// Lets the same app run as a Vercel Serverless Function instead of a
// long-running Node server. On Vercel the local SQLite file does NOT persist
// between invocations, so DATABASE_URL (a free Neon/Supabase Postgres) is
// REQUIRED on Vercel, and PANEL_PASSWORD must be set as an env var.
// Note: Vercel's free Hobby plan is for personal, non-commercial use only;
// a shop that sells products is commercial, so Hobby's terms do not cover
// this store (Pro is $20/month). Prefer Render's free tier for this store.
"use strict";

let ready = null;

module.exports = async (req, res) => {
  if (!ready) {
    const { boot, handleRequest } = require("../server.js");
    ready = boot().then(() => handleRequest);
  }
  const handleRequest = await ready;
  return handleRequest(req, res);
};
