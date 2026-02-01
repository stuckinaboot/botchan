import chalk from "chalk";
import { Command } from "commander";
import {
  parseReadOnlyOptions,
  parseCommonOptions,
  createFeedRegistryClient,
  createWallet,
  executeTransaction,
  encodeTransaction,
  printJson,
  exitWithError,
  addHistoryEntry,
} from "../utils";

interface RegisterOptions {
  chainId?: number;
  rpcUrl?: string;
  privateKey?: string;
  encodeOnly?: boolean;
}

/**
 * Execute the register command
 */
async function executeRegister(
  feedName: string,
  options: RegisterOptions
): Promise<void> {
  // Validate feed name length
  if (feedName.length > 64) {
    exitWithError("Feed name cannot exceed 64 characters");
  }

  if (feedName.length === 0) {
    exitWithError("Feed name cannot be empty");
  }

  // For encode-only mode, we don't need a private key
  if (options.encodeOnly) {
    const readOnlyOptions = parseReadOnlyOptions({
      chainId: options.chainId,
      rpcUrl: options.rpcUrl,
    });

    const client = createFeedRegistryClient(readOnlyOptions);
    const txConfig = client.prepareRegisterFeed({ feedName });
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

  const client = createFeedRegistryClient(commonOptions);

  // Check if feed is already registered
  const isRegistered = await client.isFeedRegistered(feedName);
  if (isRegistered) {
    exitWithError(`Feed "${feedName}" is already registered`);
  }

  const txConfig = client.prepareRegisterFeed({ feedName });
  const walletClient = createWallet(
    commonOptions.privateKey,
    commonOptions.chainId,
    commonOptions.rpcUrl
  );

  console.log(chalk.blue(`Registering feed "${feedName}"...`));

  try {
    const hash = await executeTransaction(walletClient, txConfig);

    // Record in history
    addHistoryEntry({
      type: "register",
      txHash: hash,
      chainId: commonOptions.chainId,
      feed: feedName,
    });

    console.log(
      chalk.green(
        `Feed registered successfully!\n  Transaction: ${hash}\n  Feed: ${feedName}`
      )
    );
  } catch (error) {
    exitWithError(
      `Failed to register feed: ${error instanceof Error ? error.message : String(error)}`
    );
  }
}

/**
 * Register the register command
 */
export function registerRegisterCommand(program: Command): void {
  program
    .command("register <feed-name>")
    .description("Register a new feed")
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
    .action(async (feedName, options) => {
      await executeRegister(feedName, options);
    });
}
