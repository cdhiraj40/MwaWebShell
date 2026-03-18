import { spawn } from "node:child_process";
import path from "node:path";
import { Prompter } from "../lib/prompts.js";
import { readProjectConfig } from "../lib/project-config.js";
import { promptBuildSigningPasswords } from "../lib/signing.js";
import { doctorEnvironment, DoctorResult, runDoctor } from "../lib/toolchain.js";
import { SigningConfig } from "../lib/types.js";

export interface BuildCommandOptions {
  projectDir?: string;
  release?: boolean;
  bundle?: boolean;
  stacktrace?: boolean;
  sdkDir?: string;
  keystorePath?: string;
  keystoreAlias?: string;
  storePasswordEnv?: string;
  keyPasswordEnv?: string;
}

export interface BuildCommandRuntime {
  doctor?: typeof runDoctor;
  resolveSigningPasswords?: (
    signing: SigningConfig,
  ) => Promise<{ storePassword: string; keyPassword: string }>;
  runGradle?: (
    command: string,
    args: string[],
    cwd: string,
    extraEnv?: NodeJS.ProcessEnv,
  ) => Promise<void>;
}

export async function runBuildCommand(
  directory: string | undefined,
  options: BuildCommandOptions,
  runtime: BuildCommandRuntime = {},
): Promise<void> {
  const projectDirectory = path.resolve(process.cwd(), directory ?? options.projectDir ?? ".");
  const doctor = runtime.doctor ?? runDoctor;
  const toolchain = await doctor({
    projectDirectory,
    sdkDir: options.sdkDir,
    fix: true,
  });

  const projectConfig = await readProjectConfig(projectDirectory);
  const signing = resolveSigning(options, projectConfig?.signing);
  const task = options.bundle
    ? "bundleRelease"
    : options.release
      ? "assembleRelease"
      : "assembleDebug";

  const gradleArgs = [task];
  if (options.stacktrace) {
    gradleArgs.push("--stacktrace");
  }

  const gradleEnv = doctorEnvironment(toolchain.java, toolchain.sdkDir);
  const prompter = new Prompter();

  try {
    if ((options.release || options.bundle) && signing.keystorePath && signing.keyAlias) {
      const credentials = await (
        runtime.resolveSigningPasswords ??
        ((candidate) => promptBuildSigningPasswords(prompter, candidate))
      )(signing);

      gradleArgs.push(
        `-PWEB_SHELL_SIGNING_STORE_FILE=${signing.keystorePath}`,
        `-PWEB_SHELL_SIGNING_KEY_ALIAS=${signing.keyAlias}`,
      );

      await (runtime.runGradle ?? runGradleCommand)(
        toolchain.gradleWrapper,
        gradleArgs,
        projectDirectory,
        {
          ...gradleEnv,
          WEB_SHELL_SIGNING_STORE_PASSWORD: credentials.storePassword,
          WEB_SHELL_SIGNING_KEY_PASSWORD: credentials.keyPassword,
        },
      );
    } else {
      if ((options.release || options.bundle) && (!signing.keystorePath || !signing.keyAlias)) {
        console.log("No signing metadata configured. Gradle will produce an unsigned release artifact.");
      }

      await (runtime.runGradle ?? runGradleCommand)(
        toolchain.gradleWrapper,
        gradleArgs,
        projectDirectory,
        gradleEnv,
      );
    }

    printBuildOutput(projectDirectory, options, toolchain);
  } finally {
    prompter.close();
  }
}

function resolveSigning(
  options: BuildCommandOptions,
  savedConfig?: SigningConfig,
): SigningConfig {
  return {
    keystorePath: options.keystorePath ?? savedConfig?.keystorePath,
    keyAlias: options.keystoreAlias ?? savedConfig?.keyAlias,
    storePasswordEnv: options.storePasswordEnv ?? savedConfig?.storePasswordEnv,
    keyPasswordEnv: options.keyPasswordEnv ?? savedConfig?.keyPasswordEnv,
  };
}

async function runGradleCommand(
  command: string,
  args: string[],
  cwd: string,
  extraEnv?: NodeJS.ProcessEnv,
): Promise<void> {
  await new Promise<void>((resolve, reject) => {
    const child = spawn(command, args, {
      cwd,
      env: {
        ...process.env,
        ...extraEnv,
      },
      stdio: "inherit",
      shell: process.platform === "win32",
    });

    child.on("error", reject);
    child.on("close", (code) => {
      if (code === 0) {
        resolve();
        return;
      }
      reject(new Error(`Gradle exited with code ${code ?? "unknown"}.`));
    });
  });
}

function printBuildOutput(
  projectDirectory: string,
  options: BuildCommandOptions,
  _toolchain: DoctorResult,
): void {
  if (options.bundle) {
    console.log(
      `Build finished. Check ${path.join(projectDirectory, "app", "build", "outputs", "bundle", "release")}`,
    );
    return;
  }

  const variant = options.release ? "release" : "debug";
  console.log(
    `Build finished. Check ${path.join(projectDirectory, "app", "build", "outputs", "apk", variant)}`,
  );
}
