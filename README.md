# 🔄 Recurse MCP

## What's This Thing?

A magical bridge between the Recurse Center's API and AI built by [Namanyay](https://nmn.gl/)

## What Does It Do?

This nifty little server lets AI tools (like Claude or ChatGPT) interact with the Recurse Center API to:

- Find fellow Recursers and ~~stalk~~ *view* their profiles
- Check who's hanging out at the hub
- Look up batches and locations

## Why?

Why not?

## Getting Started

1. Clone this repo
2. Create a `.env` file with your Recurse Center [personal access token](https://github.com/recursecenter/wiki/wiki/Recurse-Center-API#personal-access-tokens):
   ```
   RECURSE_PAT=your_token_goes_here
   ```
3. Install dependencies:
   ```
   npm install
   ```
4. Run the server:
   ```
   npm start
   ```
5. The server runs on port 9000 by default

## How It Works

This project implements the [Model Context Protocol (MCP)](https://modelcontextprotocol.io/), exposing Recurse Center API endpoints as MCP tools. It works with any MCP-compatible AI assistant.

Your AI can now search for Recursers, check batches, and do other Recurse-y things without needing direct API access.

## Requirements

- Node.js
- A Recurse Center API token
- A sense of humor

## Disclaimer

This tool was not built to help AIs infiltrate the Recurse Center community and replace all humans with sophisticated bots. Probably.
