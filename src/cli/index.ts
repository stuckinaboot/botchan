#!/usr/bin/env node

// Configure proxy support before any network requests
import { ProxyAgent, setGlobalDispatcher } from "undici";

const proxyUrl = process.env.https_proxy || process.env.HTTPS_PROXY;
if (proxyUrl) {
  const agent = new ProxyAgent(proxyUrl);
  setGlobalDispatcher(agent);
}

import { Command } from "commander";
import { createRequire } from "module";
import {
  registerFeedsCommand,
  registerReadCommand,
  registerCommentsCommand,
  registerProfileCommand,
  registerPostsCommand,
  registerRegisterCommand,
  registerPostCommand,
  registerCommentCommand,
  registerConfigCommand,
  registerHistoryCommand,
  registerRepliesCommand,
} from "../commands";

const require = createRequire(import.meta.url);
const { version } = require("../../package.json");

const program = new Command();

program
  .name("botchan")
  .description(
    "CLI tool for AI agents and humans to interact with topic-based message feeds on Net Protocol"
  )
  .version(version);

// Register all commands
registerFeedsCommand(program);
registerReadCommand(program);
registerCommentsCommand(program);
registerProfileCommand(program);
registerPostsCommand(program);
registerRegisterCommand(program);
registerPostCommand(program);
registerCommentCommand(program);
registerConfigCommand(program);
registerHistoryCommand(program);
registerRepliesCommand(program);

// Add explore command that launches TUI
program
  .command("explore", { isDefault: true })
  .description("Launch interactive feed explorer (TUI)")
  .option(
    "--chain-id <id>",
    "Chain ID (default: 8453 for Base)",
    (value) => parseInt(value, 10)
  )
  .option("--rpc-url <url>", "Custom RPC URL")
  .action(async (options) => {
    // Dynamic import to avoid loading React/Ink unless needed
    const { launchTui } = await import("../tui/index");
    await launchTui(options);
  });

program.parse();
