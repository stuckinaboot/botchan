import chalk from "chalk";
import { Command } from "commander";
import * as readline from "readline";
import {
  getMyAddress,
  setMyAddress,
  clearMyAddress,
  getFullState,
  resetState,
  getStateFilePath,
  getHistoryCount,
} from "../utils";

interface ConfigOptions {
  myAddress?: string;
  clearAddress?: boolean;
  show?: boolean;
  reset?: boolean;
  force?: boolean;
}

/**
 * Prompt user for confirmation
 */
async function confirm(message: string): Promise<boolean> {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  return new Promise((resolve) => {
    rl.question(`${message} (y/N): `, (answer) => {
      rl.close();
      resolve(answer.toLowerCase() === "y" || answer.toLowerCase() === "yes");
    });
  });
}

/**
 * Execute the config command
 */
async function executeConfig(options: ConfigOptions): Promise<void> {
  // Handle --reset
  if (options.reset) {
    const statePath = getStateFilePath();
    console.log(chalk.yellow(`This will delete all stored state at:`));
    console.log(chalk.white(`  ${statePath}`));
    console.log(chalk.yellow(`\nThis includes:`));
    console.log(chalk.white(`  - All "last seen" timestamps for feeds`));
    console.log(chalk.white(`  - Your configured address`));
    console.log(chalk.white(`  - Your activity history`));

    if (!options.force) {
      const confirmed = await confirm(chalk.red("\nAre you sure you want to reset?"));
      if (!confirmed) {
        console.log(chalk.gray("Cancelled."));
        return;
      }
    }

    resetState();
    console.log(chalk.green("State reset successfully."));
    return;
  }

  // Handle --my-address
  if (options.myAddress) {
    // Basic validation
    if (!options.myAddress.match(/^0x[a-fA-F0-9]{40}$/)) {
      console.error(chalk.red("Invalid address format. Expected 0x followed by 40 hex characters."));
      process.exit(1);
    }
    setMyAddress(options.myAddress);
    console.log(chalk.green(`Set my address to: ${options.myAddress}`));
    return;
  }

  // Handle --clear-address
  if (options.clearAddress) {
    clearMyAddress();
    console.log(chalk.green("Cleared my address."));
    return;
  }

  // Default: --show (or no options)
  const state = getFullState();
  const myAddress = getMyAddress();

  console.log(chalk.cyan("Botchan Configuration\n"));
  console.log(chalk.white(`State file: ${getStateFilePath()}`));
  console.log(chalk.white(`My address: ${myAddress ?? chalk.gray("(not set)")}`));

  const feedCount = Object.keys(state.feeds).length;
  console.log(chalk.white(`Tracked feeds: ${feedCount}`));

  const historyCount = getHistoryCount();
  console.log(chalk.white(`History entries: ${historyCount}`));

  if (feedCount > 0 && feedCount <= 20) {
    console.log(chalk.gray("\nLast seen timestamps:"));
    for (const [feed, data] of Object.entries(state.feeds)) {
      const date = new Date(data.lastSeenTimestamp * 1000);
      console.log(chalk.gray(`  ${feed}: ${date.toLocaleString()}`));
    }
  } else if (feedCount > 20) {
    console.log(chalk.gray(`\n(${feedCount} feeds tracked, use --json for full list)`));
  }
}

/**
 * Register the config command
 */
export function registerConfigCommand(program: Command): void {
  program
    .command("config")
    .description("View or modify botchan configuration")
    .option("--my-address <address>", "Set your address (to filter out own posts with --unseen)")
    .option("--clear-address", "Clear your configured address")
    .option("--show", "Show current configuration (default)")
    .option("--reset", "Reset all state (clears last-seen timestamps and address)")
    .option("--force", "Skip confirmation prompt for --reset")
    .action(async (options) => {
      await executeConfig(options);
    });
}
