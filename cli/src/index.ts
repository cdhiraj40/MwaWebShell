#!/usr/bin/env node

import { parseArgs } from "node:util";
import { runBuildCommand } from "./commands/build.js";
import { runDoctorCommand } from "./commands/doctor.js";
import { runInitCommand } from "./commands/init.js";

const CLI_VERSION = "0.1.0";

async function main(): Promise<void> {
  ensureSupportedNodeVersion();

  const argv = process.argv.slice(2);
  const command = argv[0];

  if (!command || command === "help" || command === "--help" || command === "-h") {
    printHelp();
    return;
  }

  if (command === "--version" || command === "-v") {
    console.log(CLI_VERSION);
    return;
  }

  switch (command) {
    case "init": {
      const { values, positionals } = parseArgs({
        args: argv.slice(1),
        allowPositionals: true,
        options: {
          manifest: { type: "string" },
          "application-id": { type: "string" },
          "app-name": { type: "string" },
          url: { type: "string" },
          "keystore-path": { type: "string" },
          "keystore-alias": { type: "string" },
          "keystore-store-password-env": { type: "string" },
          "keystore-key-password-env": { type: "string" },
          force: { type: "boolean" },
          help: { type: "boolean", short: "h" },
        },
      });

      if (values.help) {
        printInitHelp();
        return;
      }

      await runInitCommand(positionals[0], {
        manifest: values.manifest,
        applicationId: values["application-id"],
        appName: values["app-name"],
        url: values.url,
        keystorePath: values["keystore-path"],
        keystoreAlias: values["keystore-alias"],
        keystoreStorePasswordEnv: values["keystore-store-password-env"],
        keystoreKeyPasswordEnv: values["keystore-key-password-env"],
        force: values.force,
      });
      return;
    }

    case "build": {
      const { values, positionals } = parseArgs({
        args: argv.slice(1),
        allowPositionals: true,
        options: {
          "project-dir": { type: "string" },
          release: { type: "boolean" },
          bundle: { type: "boolean" },
          stacktrace: { type: "boolean" },
          "sdk-dir": { type: "string" },
          "keystore-path": { type: "string" },
          "keystore-alias": { type: "string" },
          "store-password-env": { type: "string" },
          "key-password-env": { type: "string" },
          help: { type: "boolean", short: "h" },
        },
      });

      if (values.help) {
        printBuildHelp();
        return;
      }

      await runBuildCommand(positionals[0], {
        projectDir: values["project-dir"],
        release: values.release,
        bundle: values.bundle,
        stacktrace: values.stacktrace,
        sdkDir: values["sdk-dir"],
        keystorePath: values["keystore-path"],
        keystoreAlias: values["keystore-alias"],
        storePasswordEnv: values["store-password-env"],
        keyPasswordEnv: values["key-password-env"],
      });
      return;
    }

    case "doctor": {
      const { values, positionals } = parseArgs({
        args: argv.slice(1),
        allowPositionals: true,
        options: {
          "project-dir": { type: "string" },
          "sdk-dir": { type: "string" },
          fix: { type: "boolean" },
          help: { type: "boolean", short: "h" },
        },
      });

      if (values.help) {
        printDoctorHelp();
        return;
      }

      await runDoctorCommand(positionals[0], {
        projectDir: values["project-dir"],
        sdkDir: values["sdk-dir"],
        fix: values.fix,
      });
      return;
    }

    default:
      throw new Error(`Unknown command: ${command}`);
  }
}

function ensureSupportedNodeVersion(): void {
  const majorVersion = Number.parseInt(process.versions.node.split(".")[0] ?? "0", 10);
  if (majorVersion < 24) {
    throw new Error(
      `Node 24 or newer is required. Found ${process.versions.node}.`,
    );
  }
}

function printHelp(): void {
  console.log(`Solana Mobile Web Shell CLI ${CLI_VERSION}

Usage:
  mwa-webshell <command> [options]

Commands:
  init [directory]   Generate a new Android WebView shell project
  build [directory]  Build a generated Android project
  doctor [directory] Check and optionally install required Android build tools

Run "mwa-webshell <command> --help" for command-specific options.`);
}

function printInitHelp(): void {
  console.log(`Usage:
  mwa-webshell init [directory] [options]

Options:
  --manifest <path-or-url>                     Load a web manifest.json or Bubblewrap twa-manifest.json
  --application-id <id>                        Android application ID
  --app-name <name>                            Android launcher name
  --url <url>                                  Default web URL to load
  --keystore-path <path>                       Optional release keystore path
  --keystore-alias <alias>                     Optional release key alias
  --keystore-store-password-env <env>          Env var for keystore password
  --keystore-key-password-env <env>            Env var for key password
  --force                                      Overwrite template files if needed
  -h, --help                                   Show help`);
}

function printBuildHelp(): void {
  console.log(`Usage:
  mwa-webshell build [directory] [options]

Options:
  --project-dir <path>         Explicit project directory
  --release                    Build a release APK
  --bundle                     Build a release app bundle
  --stacktrace                 Pass --stacktrace to Gradle
  --sdk-dir <path>             Android SDK directory override
  --keystore-path <path>       Release keystore path override
  --keystore-alias <alias>     Release key alias override
  --store-password-env <env>   Env var containing the keystore password
  --key-password-env <env>     Env var containing the key password
  -h, --help                   Show help`);
}

function printDoctorHelp(): void {
  console.log(`Usage:
  mwa-webshell doctor [directory] [options]

Options:
  --project-dir <path>         Explicit project directory
  --sdk-dir <path>             Android SDK directory override
  --fix                        Install missing tools and SDK packages automatically
  -h, --help                   Show help`);
}

main().catch((error) => {
  const message = error instanceof Error ? error.message : String(error);
  console.error(`Error: ${message}`);
  process.exitCode = 1;
});
