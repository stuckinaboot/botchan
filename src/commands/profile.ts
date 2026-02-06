import chalk from "chalk";
import { Command } from "commander";
import { createWalletClient, http, publicActions } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { base } from "viem/chains";
import { getChainRpcUrls } from "@net-protocol/core";
import {
  PROFILE_PICTURE_STORAGE_KEY,
  PROFILE_METADATA_STORAGE_KEY,
  parseProfileMetadata,
  getProfilePictureStorageArgs,
  getProfileMetadataStorageArgs,
  isValidUrl,
  isValidXUsername,
  isValidBio,
  isValidDisplayName,
  STORAGE_CONTRACT,
} from "@net-protocol/profiles";
import type { ReadOnlyOptions } from "../utils";
import {
  parseReadOnlyOptions,
  parseCommonOptions,
  createStorageClient,
  encodeTransaction,
  printJson,
  exitWithError,
} from "../utils";

interface ProfileGetOptions {
  address: string;
  chainId?: number;
  rpcUrl?: string;
  json?: boolean;
}

interface ProfileSetPictureOptions {
  url: string;
  chainId?: number;
  rpcUrl?: string;
  privateKey?: string;
  encodeOnly?: boolean;
}

interface ProfileSetXUsernameOptions {
  username: string;
  chainId?: number;
  rpcUrl?: string;
  privateKey?: string;
  encodeOnly?: boolean;
  address?: string; // Optional address for encode-only mode to preserve existing metadata
}

interface ProfileSetBioOptions {
  bio: string;
  chainId?: number;
  rpcUrl?: string;
  privateKey?: string;
  encodeOnly?: boolean;
  address?: string; // Optional address for encode-only mode to preserve existing metadata
}

interface ProfileSetDisplayNameOptions {
  displayName: string;
  chainId?: number;
  rpcUrl?: string;
  privateKey?: string;
  encodeOnly?: boolean;
  address?: string; // Optional address for encode-only mode to preserve existing metadata
}

/**
 * Read existing profile metadata for an address
 * Returns { x_username, bio } or empty object if not found
 */
async function readExistingMetadata(
  address: `0x${string}`,
  readOnlyOptions: ReadOnlyOptions
): Promise<{ x_username?: string; bio?: string; display_name?: string }> {
  const client = createStorageClient(readOnlyOptions);
  try {
    const metadataResult = await client.readStorageData({
      key: PROFILE_METADATA_STORAGE_KEY,
      operator: address,
    });
    if (metadataResult.data) {
      const metadata = parseProfileMetadata(metadataResult.data);
      return {
        x_username: metadata?.x_username,
        bio: metadata?.bio,
        display_name: metadata?.display_name,
      };
    }
  } catch (error) {
    // Not found is okay - return empty
    const errorMessage = error instanceof Error ? error.message : String(error);
    if (errorMessage !== "StoredDataNotFound") {
      throw error;
    }
  }
  return {};
}

/**
 * Execute the profile get command - reads profile data for an address
 */
async function executeProfileGet(options: ProfileGetOptions): Promise<void> {
  // Validate address format
  if (!options.address.startsWith("0x") || options.address.length !== 42) {
    exitWithError("Invalid address format. Must be 0x-prefixed, 42 characters");
  }

  const readOnlyOptions = parseReadOnlyOptions({
    chainId: options.chainId,
    rpcUrl: options.rpcUrl,
  });

  const client = createStorageClient(readOnlyOptions);

  try {
    // Fetch profile picture
    let profilePicture: string | undefined;
    try {
      const pictureResult = await client.readStorageData({
        key: PROFILE_PICTURE_STORAGE_KEY,
        operator: options.address as `0x${string}`,
      });
      if (pictureResult.data) {
        profilePicture = pictureResult.data;
      }
    } catch (error) {
      // Not found is okay
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      if (errorMessage !== "StoredDataNotFound") {
        throw error;
      }
    }

    // Fetch profile metadata (X username, bio, display name)
    let xUsername: string | undefined;
    let bio: string | undefined;
    let displayName: string | undefined;
    try {
      const metadataResult = await client.readStorageData({
        key: PROFILE_METADATA_STORAGE_KEY,
        operator: options.address as `0x${string}`,
      });
      if (metadataResult.data) {
        const metadata = parseProfileMetadata(metadataResult.data);
        xUsername = metadata?.x_username;
        bio = metadata?.bio;
        displayName = metadata?.display_name;
      }
    } catch (error) {
      // Not found is okay
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      if (errorMessage !== "StoredDataNotFound") {
        throw error;
      }
    }

    const hasProfile = !!(profilePicture || xUsername || bio || displayName);

    if (options.json) {
      const output = {
        address: options.address,
        chainId: readOnlyOptions.chainId,
        displayName: displayName || null,
        profilePicture: profilePicture || null,
        xUsername: xUsername || null,
        bio: bio || null,
        hasProfile,
      };
      printJson(output);
      return;
    }

    // Human-readable output
    console.log(chalk.white.bold("\nProfile:\n"));
    console.log(`  ${chalk.cyan("Address:")} ${options.address}`);
    console.log(`  ${chalk.cyan("Chain ID:")} ${readOnlyOptions.chainId}`);
    console.log(
      `  ${chalk.cyan("Display Name:")} ${
        displayName || chalk.gray("(not set)")
      }`
    );
    console.log(
      `  ${chalk.cyan("Profile Picture:")} ${
        profilePicture || chalk.gray("(not set)")
      }`
    );
    console.log(
      `  ${chalk.cyan("X Username:")} ${
        xUsername ? `@${xUsername}` : chalk.gray("(not set)")
      }`
    );
    console.log(`  ${chalk.cyan("Bio:")} ${bio || chalk.gray("(not set)")}`);

    if (!hasProfile) {
      console.log(chalk.yellow("\n  No profile data found for this address."));
    }
    console.log();
  } catch (error) {
    exitWithError(
      `Failed to read profile: ${
        error instanceof Error ? error.message : String(error)
      }`
    );
  }
}

/**
 * Execute the profile set-picture command
 */
async function executeProfileSetPicture(
  options: ProfileSetPictureOptions
): Promise<void> {
  // Validate URL
  if (!isValidUrl(options.url)) {
    exitWithError(
      `Invalid URL: "${options.url}". Please provide a valid URL (e.g., https://example.com/image.jpg)`
    );
  }

  // Get storage args
  const storageArgs = getProfilePictureStorageArgs(options.url);

  // Handle encode-only mode (no private key required)
  if (options.encodeOnly) {
    const readOnlyOptions = parseReadOnlyOptions({
      chainId: options.chainId,
      rpcUrl: options.rpcUrl,
    });
    const encoded = encodeTransaction(
      {
        to: STORAGE_CONTRACT.address as `0x${string}`,
        abi: STORAGE_CONTRACT.abi,
        functionName: "put",
        args: [storageArgs.bytesKey, storageArgs.topic, storageArgs.bytesValue],
      },
      readOnlyOptions.chainId
    );
    printJson(encoded);
    return;
  }

  // Parse common options (requires private key for transaction submission)
  const commonOptions = parseCommonOptions(
    {
      privateKey: options.privateKey,
      chainId: options.chainId,
      rpcUrl: options.rpcUrl,
    },
    true // supports --encode-only
  );

  try {
    // Create wallet client
    const account = privateKeyToAccount(commonOptions.privateKey);
    const rpcUrls = getChainRpcUrls({
      chainId: commonOptions.chainId,
      rpcUrl: commonOptions.rpcUrl,
    });

    const client = createWalletClient({
      account,
      chain: base,
      transport: http(rpcUrls[0]),
    }).extend(publicActions);

    console.log(chalk.blue(`Setting profile picture...`));
    console.log(chalk.gray(`   URL: ${options.url}`));
    console.log(chalk.gray(`   Address: ${account.address}`));

    // Submit transaction
    const hash = await client.writeContract({
      address: STORAGE_CONTRACT.address as `0x${string}`,
      abi: STORAGE_CONTRACT.abi,
      functionName: "put",
      args: [storageArgs.bytesKey, storageArgs.topic, storageArgs.bytesValue],
    });

    console.log(chalk.blue(`Waiting for confirmation...`));

    // Wait for transaction
    const receipt = await client.waitForTransactionReceipt({ hash });

    if (receipt.status === "success") {
      console.log(
        chalk.green(
          `\nProfile picture updated successfully!\n  Transaction: ${hash}\n  URL: ${options.url}`
        )
      );
    } else {
      exitWithError(`Transaction failed: ${hash}`);
    }
  } catch (error) {
    exitWithError(
      `Failed to set profile picture: ${
        error instanceof Error ? error.message : String(error)
      }`
    );
  }
}

/**
 * Execute the profile set-x-username command
 */
async function executeProfileSetXUsername(
  options: ProfileSetXUsernameOptions
): Promise<void> {
  // Validate username
  if (!isValidXUsername(options.username)) {
    exitWithError(
      `Invalid X username: "${options.username}". Usernames must be 1-15 characters, alphanumeric and underscores only.`
    );
  }

  // Normalize username for display (strip @ if present for storage)
  const usernameForStorage = options.username.startsWith("@")
    ? options.username.slice(1)
    : options.username;
  const displayUsername = `@${usernameForStorage}`;

  // Parse read-only options for reading existing metadata
  const readOnlyOptions = parseReadOnlyOptions({
    chainId: options.chainId,
    rpcUrl: options.rpcUrl,
  });

  // Handle encode-only mode (no private key required)
  if (options.encodeOnly) {
    // If address provided, read existing metadata to preserve bio and display_name
    let existingBio: string | undefined;
    let existingDisplayName: string | undefined;
    if (options.address) {
      if (!options.address.startsWith("0x") || options.address.length !== 42) {
        exitWithError("Invalid address format. Must be 0x-prefixed, 42 characters");
      }
      const existing = await readExistingMetadata(
        options.address as `0x${string}`,
        readOnlyOptions
      );
      existingBio = existing.bio;
      existingDisplayName = existing.display_name;
    }

    const storageArgs = getProfileMetadataStorageArgs({
      x_username: usernameForStorage,
      bio: existingBio,
      display_name: existingDisplayName,
    });
    const encoded = encodeTransaction(
      {
        to: STORAGE_CONTRACT.address as `0x${string}`,
        abi: STORAGE_CONTRACT.abi,
        functionName: "put",
        args: [storageArgs.bytesKey, storageArgs.topic, storageArgs.bytesValue],
      },
      readOnlyOptions.chainId
    );
    printJson(encoded);
    return;
  }

  // Parse common options (requires private key for transaction submission)
  const commonOptions = parseCommonOptions(
    {
      privateKey: options.privateKey,
      chainId: options.chainId,
      rpcUrl: options.rpcUrl,
    },
    true // supports --encode-only
  );

  try {
    // Create wallet client
    const account = privateKeyToAccount(commonOptions.privateKey);
    const rpcUrls = getChainRpcUrls({
      chainId: commonOptions.chainId,
      rpcUrl: commonOptions.rpcUrl,
    });

    const client = createWalletClient({
      account,
      chain: base,
      transport: http(rpcUrls[0]),
    }).extend(publicActions);

    console.log(chalk.blue(`Setting X username...`));
    console.log(chalk.gray(`   Username: ${displayUsername}`));
    console.log(chalk.gray(`   Address: ${account.address}`));

    // Read existing metadata to preserve bio and display_name
    const existing = await readExistingMetadata(account.address, readOnlyOptions);
    if (existing.bio) {
      console.log(chalk.gray(`   Preserving existing bio`));
    }
    if (existing.display_name) {
      console.log(chalk.gray(`   Preserving existing display name`));
    }

    // Get storage args with merged metadata
    const storageArgs = getProfileMetadataStorageArgs({
      x_username: usernameForStorage,
      bio: existing.bio,
      display_name: existing.display_name,
    });

    // Submit transaction
    const hash = await client.writeContract({
      address: STORAGE_CONTRACT.address as `0x${string}`,
      abi: STORAGE_CONTRACT.abi,
      functionName: "put",
      args: [storageArgs.bytesKey, storageArgs.topic, storageArgs.bytesValue],
    });

    console.log(chalk.blue(`Waiting for confirmation...`));

    // Wait for transaction
    const receipt = await client.waitForTransactionReceipt({ hash });

    if (receipt.status === "success") {
      console.log(
        chalk.green(
          `\nX username updated successfully!\n  Transaction: ${hash}\n  Username: ${displayUsername}`
        )
      );
    } else {
      exitWithError(`Transaction failed: ${hash}`);
    }
  } catch (error) {
    exitWithError(
      `Failed to set X username: ${
        error instanceof Error ? error.message : String(error)
      }`
    );
  }
}

/**
 * Execute the profile set-bio command
 */
async function executeProfileSetBio(
  options: ProfileSetBioOptions
): Promise<void> {
  // Validate bio
  if (!isValidBio(options.bio)) {
    exitWithError(
      `Invalid bio: "${options.bio}". Bio must be 1-280 characters and cannot contain control characters.`
    );
  }

  // Parse read-only options for reading existing metadata
  const readOnlyOptions = parseReadOnlyOptions({
    chainId: options.chainId,
    rpcUrl: options.rpcUrl,
  });

  // Handle encode-only mode (no private key required)
  if (options.encodeOnly) {
    // If address provided, read existing metadata to preserve x_username and display_name
    let existingXUsername: string | undefined;
    let existingDisplayName: string | undefined;
    if (options.address) {
      if (!options.address.startsWith("0x") || options.address.length !== 42) {
        exitWithError("Invalid address format. Must be 0x-prefixed, 42 characters");
      }
      const existing = await readExistingMetadata(
        options.address as `0x${string}`,
        readOnlyOptions
      );
      existingXUsername = existing.x_username;
      existingDisplayName = existing.display_name;
    }

    const storageArgs = getProfileMetadataStorageArgs({
      bio: options.bio,
      x_username: existingXUsername,
      display_name: existingDisplayName,
    });
    const encoded = encodeTransaction(
      {
        to: STORAGE_CONTRACT.address as `0x${string}`,
        abi: STORAGE_CONTRACT.abi,
        functionName: "put",
        args: [storageArgs.bytesKey, storageArgs.topic, storageArgs.bytesValue],
      },
      readOnlyOptions.chainId
    );
    printJson(encoded);
    return;
  }

  // Parse common options (requires private key for transaction submission)
  const commonOptions = parseCommonOptions(
    {
      privateKey: options.privateKey,
      chainId: options.chainId,
      rpcUrl: options.rpcUrl,
    },
    true // supports --encode-only
  );

  try {
    // Create wallet client
    const account = privateKeyToAccount(commonOptions.privateKey);
    const rpcUrls = getChainRpcUrls({
      chainId: commonOptions.chainId,
      rpcUrl: commonOptions.rpcUrl,
    });

    const client = createWalletClient({
      account,
      chain: base,
      transport: http(rpcUrls[0]),
    }).extend(publicActions);

    console.log(chalk.blue(`Setting profile bio...`));
    console.log(chalk.gray(`   Bio: ${options.bio}`));
    console.log(chalk.gray(`   Address: ${account.address}`));

    // Read existing metadata to preserve x_username and display_name
    const existing = await readExistingMetadata(account.address, readOnlyOptions);
    if (existing.x_username) {
      console.log(chalk.gray(`   Preserving existing X username`));
    }
    if (existing.display_name) {
      console.log(chalk.gray(`   Preserving existing display name`));
    }

    // Get storage args with merged metadata
    const storageArgs = getProfileMetadataStorageArgs({
      bio: options.bio,
      x_username: existing.x_username,
      display_name: existing.display_name,
    });

    // Submit transaction
    const hash = await client.writeContract({
      address: STORAGE_CONTRACT.address as `0x${string}`,
      abi: STORAGE_CONTRACT.abi,
      functionName: "put",
      args: [storageArgs.bytesKey, storageArgs.topic, storageArgs.bytesValue],
    });

    console.log(chalk.blue(`Waiting for confirmation...`));

    // Wait for transaction
    const receipt = await client.waitForTransactionReceipt({ hash });

    if (receipt.status === "success") {
      console.log(
        chalk.green(
          `\nBio updated successfully!\n  Transaction: ${hash}\n  Bio: ${options.bio}`
        )
      );
    } else {
      exitWithError(`Transaction failed: ${hash}`);
    }
  } catch (error) {
    exitWithError(
      `Failed to set bio: ${
        error instanceof Error ? error.message : String(error)
      }`
    );
  }
}

/**
 * Execute the profile set-display-name command
 */
async function executeProfileSetDisplayName(
  options: ProfileSetDisplayNameOptions
): Promise<void> {
  // Validate display name
  if (!isValidDisplayName(options.displayName)) {
    exitWithError(
      `Invalid display name: "${options.displayName}". Display name must be non-empty and valid.`
    );
  }

  // Parse read-only options for reading existing metadata
  const readOnlyOptions = parseReadOnlyOptions({
    chainId: options.chainId,
    rpcUrl: options.rpcUrl,
  });

  // Handle encode-only mode (no private key required)
  if (options.encodeOnly) {
    // If address provided, read existing metadata to preserve x_username and bio
    let existingXUsername: string | undefined;
    let existingBio: string | undefined;
    if (options.address) {
      if (!options.address.startsWith("0x") || options.address.length !== 42) {
        exitWithError("Invalid address format. Must be 0x-prefixed, 42 characters");
      }
      const existing = await readExistingMetadata(
        options.address as `0x${string}`,
        readOnlyOptions
      );
      existingXUsername = existing.x_username;
      existingBio = existing.bio;
    }

    const storageArgs = getProfileMetadataStorageArgs({
      display_name: options.displayName,
      x_username: existingXUsername,
      bio: existingBio,
    });
    const encoded = encodeTransaction(
      {
        to: STORAGE_CONTRACT.address as `0x${string}`,
        abi: STORAGE_CONTRACT.abi,
        functionName: "put",
        args: [storageArgs.bytesKey, storageArgs.topic, storageArgs.bytesValue],
      },
      readOnlyOptions.chainId
    );
    printJson(encoded);
    return;
  }

  // Parse common options (requires private key for transaction submission)
  const commonOptions = parseCommonOptions(
    {
      privateKey: options.privateKey,
      chainId: options.chainId,
      rpcUrl: options.rpcUrl,
    },
    true // supports --encode-only
  );

  try {
    // Create wallet client
    const account = privateKeyToAccount(commonOptions.privateKey);
    const rpcUrls = getChainRpcUrls({
      chainId: commonOptions.chainId,
      rpcUrl: commonOptions.rpcUrl,
    });

    const client = createWalletClient({
      account,
      chain: base,
      transport: http(rpcUrls[0]),
    }).extend(publicActions);

    console.log(chalk.blue(`Setting display name...`));
    console.log(chalk.gray(`   Display Name: ${options.displayName}`));
    console.log(chalk.gray(`   Address: ${account.address}`));

    // Read existing metadata to preserve x_username and bio
    const existing = await readExistingMetadata(account.address, readOnlyOptions);
    if (existing.x_username) {
      console.log(chalk.gray(`   Preserving existing X username`));
    }
    if (existing.bio) {
      console.log(chalk.gray(`   Preserving existing bio`));
    }

    // Get storage args with merged metadata
    const storageArgs = getProfileMetadataStorageArgs({
      display_name: options.displayName,
      x_username: existing.x_username,
      bio: existing.bio,
    });

    // Submit transaction
    const hash = await client.writeContract({
      address: STORAGE_CONTRACT.address as `0x${string}`,
      abi: STORAGE_CONTRACT.abi,
      functionName: "put",
      args: [storageArgs.bytesKey, storageArgs.topic, storageArgs.bytesValue],
    });

    console.log(chalk.blue(`Waiting for confirmation...`));

    // Wait for transaction
    const receipt = await client.waitForTransactionReceipt({ hash });

    if (receipt.status === "success") {
      console.log(
        chalk.green(
          `\nDisplay name updated successfully!\n  Transaction: ${hash}\n  Display Name: ${options.displayName}`
        )
      );
    } else {
      exitWithError(`Transaction failed: ${hash}`);
    }
  } catch (error) {
    exitWithError(
      `Failed to set display name: ${
        error instanceof Error ? error.message : String(error)
      }`
    );
  }
}

/**
 * Register the profile command group
 */
export function registerProfileCommand(program: Command): void {
  const profileCmd = program
    .command("profile")
    .description("Manage user profile (display name, picture, X username, bio)");

  // profile get --address <addr>
  profileCmd
    .command("get")
    .description("Read profile metadata for an address")
    .requiredOption("--address <addr>", "Address to read profile for")
    .option(
      "--chain-id <id>",
      "Chain ID (default: 8453 for Base)",
      (value) => parseInt(value, 10)
    )
    .option("--rpc-url <url>", "Custom RPC URL")
    .option("--json", "Output in JSON format")
    .action(async (options) => {
      await executeProfileGet(options);
    });

  // profile set-picture --url <url>
  profileCmd
    .command("set-picture")
    .description("Set profile picture URL")
    .requiredOption("--url <url>", "Profile picture URL")
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
    .action(async (options) => {
      await executeProfileSetPicture(options);
    });

  // profile set-x-username --username <name>
  profileCmd
    .command("set-x-username")
    .description("Set X (Twitter) username")
    .requiredOption("--username <name>", "X username (with or without @)")
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
    .option(
      "--address <addr>",
      "Address to preserve existing metadata for (used with --encode-only)"
    )
    .action(async (options) => {
      await executeProfileSetXUsername(options);
    });

  // profile set-bio --bio <text>
  profileCmd
    .command("set-bio")
    .description("Set profile bio")
    .requiredOption("--bio <text>", "Profile bio text (max 280 characters)")
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
    .option(
      "--address <addr>",
      "Address to preserve existing metadata for (used with --encode-only)"
    )
    .action(async (options) => {
      await executeProfileSetBio(options);
    });

  // profile set-display-name --name <name>
  profileCmd
    .command("set-display-name")
    .description("Set profile display name")
    .requiredOption("--name <name>", "Display name")
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
    .option(
      "--address <addr>",
      "Address to preserve existing metadata for (used with --encode-only)"
    )
    .action(async (options) => {
      await executeProfileSetDisplayName({
        ...options,
        displayName: options.name,
      });
    });
}
