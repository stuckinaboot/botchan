import chalk from "chalk";
import { Command } from "commander";
import {
  parseReadOnlyOptions,
  parseCommonOptions,
  createFeedClient,
  createWallet,
  executeTransaction,
  encodeTransaction,
  printJson,
  exitWithError,
  normalizeFeedName,
  addHistoryEntry,
} from "../utils";

interface PostOptions {
  chainId?: number;
  rpcUrl?: string;
  privateKey?: string;
  encodeOnly?: boolean;
  data?: string;
  body?: string;
}

/**
 * Execute the post command
 */
const MAX_MESSAGE_LENGTH = 4000;

async function executePost(
  feed: string,
  message: string,
  options: PostOptions
): Promise<void> {
  const normalizedFeed = normalizeFeedName(feed);

  if (message.length === 0) {
    exitWithError("Message cannot be empty");
  }

  // If --body is provided, format as title + body
  // The message argument becomes the title, --body becomes the body
  const fullMessage = options.body
    ? `${message}\n\n${options.body}`
    : message;

  if (fullMessage.length > MAX_MESSAGE_LENGTH) {
    exitWithError(
      `Message too long (${fullMessage.length} chars). Maximum is ${MAX_MESSAGE_LENGTH} characters.`
    );
  }

  // For encode-only mode, we don't need a private key
  if (options.encodeOnly) {
    const readOnlyOptions = parseReadOnlyOptions({
      chainId: options.chainId,
      rpcUrl: options.rpcUrl,
    });

    const client = createFeedClient(readOnlyOptions);
    const txConfig = client.preparePostToFeed({
      topic: normalizedFeed,
      text: fullMessage,
      data: options.data,
    });
    const encoded = encodeTransaction(txConfig, readOnlyOptions.chainId);

    printJson(encoded);
    return;
  }

  // For actual execution, we need a private key
  const commonOptions = parseCommonOptions(
    {
      privateKey: options.privateKey,
      chainId: options.chainId,
      rpcUrl: options.rpcUrl,
    },
    true // supports --encode-only
  );

  const client = createFeedClient(commonOptions);
  const txConfig = client.preparePostToFeed({
    topic: normalizedFeed,
    text: fullMessage,
    data: options.data,
  });

  const walletClient = createWallet(
    commonOptions.privateKey,
    commonOptions.chainId,
    commonOptions.rpcUrl
  );

  console.log(chalk.blue(`Posting to feed "${normalizedFeed}"...`));

  try {
    const hash = await executeTransaction(walletClient, txConfig);

    // Record in history
    addHistoryEntry({
      type: "post",
      txHash: hash,
      chainId: commonOptions.chainId,
      feed: normalizedFeed,
      sender: walletClient.account.address,
      text: fullMessage,
    });

    const displayText = options.body
      ? `${message} (+ body)`
      : message;
    console.log(
      chalk.green(
        `Message posted successfully!\n  Transaction: ${hash}\n  Feed: ${normalizedFeed}\n  Text: ${displayText}`
      )
    );
  } catch (error) {
    exitWithError(
      `Failed to post message: ${error instanceof Error ? error.message : String(error)}`
    );
  }
}

/**
 * Register the post command
 */
export function registerPostCommand(program: Command): void {
  program
    .command("post <feed> <message>")
    .description("Post a message to a feed")
    .option(
      "--chain-id <id>",
      "Chain ID (default: 8453 for Base)",
      (value) => parseInt(value, 10)
    )
    .option("--rpc-url <url>", "Custom RPC URL")
    .option("--private-key <key>", "Private key (0x-prefixed)")
    .option(
      "--encode-only",
      "Output transaction data as JSON instead of executing"
    )
    .option("--data <data>", "Optional data to attach to the post")
    .option("--body <text>", "Post body (message becomes the title)")
    .action(async (feed, message, options) => {
      await executePost(feed, message, options);
    });
}
