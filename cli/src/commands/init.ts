import path from "node:path";
import { fileURLToPath } from "node:url";
import { applyProjectConfiguration } from "../lib/android-project.js";
import {
  loadManifest,
  loadWebManifest,
} from "../lib/manifests.js";
import { ensureInitSigning } from "../lib/signing.js";
import { writeProjectConfig } from "../lib/project-config.js";
import { Prompter } from "../lib/prompts.js";
import {
  DEFAULT_TEMPLATE_REF,
  DEFAULT_TEMPLATE_REPOSITORY_URL,
  copyTemplateProject,
} from "../lib/template.js";
import {
  deriveApplicationIdFromUrl,
  deriveApplicationIdSuggestionFromUrl,
  derivePackageNameSuggestionFromApplicationId,
  isDirectoryEmpty,
  normalizeHttpUrl,
  resolveRepositoryRoot,
  validateApplicationId,
} from "../lib/utils.js";
import { GeneratedProjectConfig, ManifestSeed, SigningConfig } from "../lib/types.js";

export interface InitCommandOptions {
  manifest?: string;
  applicationId?: string;
  appName?: string;
  url?: string;
  projectName?: string;
  keystorePath?: string;
  keystoreAlias?: string;
  keystoreStorePasswordEnv?: string;
  keystoreKeyPasswordEnv?: string;
  templateRepo?: string;
  templateRef?: string;
  nonInteractive?: boolean;
  force?: boolean;
}

export async function runInitCommand(
  directory: string | undefined,
  options: InitCommandOptions,
): Promise<void> {
  const cwd = process.cwd();
  const targetDirectory = path.resolve(cwd, directory ?? ".");
  const repositoryRoot = resolveRepositoryRoot(import.meta.url);

  if (targetDirectory === repositoryRoot) {
    throw new Error("Refusing to generate into the template repository root.");
  }

  const inputManifestSeed = options.manifest
    ? await loadManifest(options.manifest, cwd)
    : undefined;
  const bubblewrapSeed = inputManifestSeed?.kind === "bubblewrap"
    ? inputManifestSeed
    : undefined;
  const webManifestSeed = inputManifestSeed?.kind === "web"
    ? inputManifestSeed
    : bubblewrapSeed?.webManifestUrl
      ? await loadWebManifest(bubblewrapSeed.webManifestUrl, cwd)
      : undefined;

  const prompter = new Prompter(options.nonInteractive ? false : undefined);
  try {
    const overwrite =
      options.force ||
      (await isDirectoryEmpty(targetDirectory)) ||
      (await prompter.confirm(
        `Target directory ${targetDirectory} is not empty. Overwrite template files if needed?`,
        false,
      ));

    if (!overwrite && !(await isDirectoryEmpty(targetDirectory))) {
      throw new Error("Target directory is not empty. Re-run with --force to overwrite.");
    }

    const initialWebUrl = resolveInitialWebUrl(
      options.url,
      bubblewrapSeed,
      webManifestSeed,
    );
    const applicationId = await resolveApplicationId(
      prompter,
      options.applicationId,
      initialWebUrl,
      bubblewrapSeed,
    );
    const packageNameSuggestion = derivePackageNameSuggestionFromApplicationId(applicationId);
    if (packageNameSuggestion.note && prompter.isInteractive()) {
      console.log(`Note: ${packageNameSuggestion.note}`);
    }
    const initialAppName = resolveInitialAppName(
      options.appName,
      bubblewrapSeed,
      webManifestSeed,
    );
    const appName = await resolveAppName(
      prompter,
      initialAppName,
    );
    const webUrl = await resolveWebUrl(
      prompter,
      options.url,
      bubblewrapSeed,
      webManifestSeed,
    );
    const projectName = resolveProjectName(
      targetDirectory,
      options.projectName,
      appName,
    );
    const templateRepo = options.templateRepo ?? DEFAULT_TEMPLATE_REPOSITORY_URL;
    const templateRef = options.templateRef ?? DEFAULT_TEMPLATE_REF;

    const initialSigning = resolveSigning(options, bubblewrapSeed);

    await copyTemplateProject(targetDirectory, overwrite, {
      repositoryUrl: templateRepo,
      ref: templateRef,
    });

    const signing = await ensureInitSigning(
      prompter,
      targetDirectory,
      appName,
      initialSigning,
    );

    const projectConfig: GeneratedProjectConfig = {
      schemaVersion: 1,
      generatedAt: new Date().toISOString(),
      projectName,
      appName,
      applicationId,
      packageName: packageNameSuggestion.packageName,
      webUrl,
      source: {
        templateRepo,
        templateRef,
        webManifest: webManifestSeed?.source,
        bubblewrapManifest: bubblewrapSeed?.source,
      },
      signing,
    };

    await applyProjectConfiguration(targetDirectory, projectConfig, webManifestSeed);
    await writeProjectConfig(targetDirectory, projectConfig);

    console.log(`Generated project at ${targetDirectory}`);
    console.log(`Application ID: ${applicationId}`);
    console.log(`Web URL: ${webUrl}`);
    console.log(`Template source: ${templateRepo}#${templateRef}`);
    // TODO: switch this back to the installed `mwa-webshell build ...` command
    // once the CLI is published as a real npm package.
    console.log("Next steps:");
    console.log(`  For now: pnpm cli -- build ${quoteShellValue(targetDirectory)}`);
  } finally {
    prompter.close();
  }
}

async function resolveApplicationId(
  prompter: Prompter,
  explicitValue: string | undefined,
  webUrl: string | undefined,
  bubblewrapSeed?: ManifestSeed,
): Promise<string> {
  const derivedSuggestion =
    !explicitValue && !bubblewrapSeed?.applicationId && webUrl
      ? deriveApplicationIdSuggestionFromUrl(webUrl)
      : undefined;

  if (derivedSuggestion?.note && prompter.isInteractive()) {
    console.log(`Note: ${derivedSuggestion.note}`);
  }

  const candidate =
    explicitValue ??
    bubblewrapSeed?.applicationId ??
    derivedSuggestion?.applicationId ??
    (webUrl ? deriveApplicationIdFromUrl(webUrl) : undefined);
  return prompter.text("Android application ID", {
    defaultValue: candidate,
    validate: validateApplicationId,
  });
}

async function resolveAppName(
  prompter: Prompter,
  defaultValue: string | undefined,
): Promise<string> {
  return prompter.text("App name", {
    defaultValue,
    validate: requireNonEmpty("App name"),
  });
}

async function resolveWebUrl(
  prompter: Prompter,
  explicitValue: string | undefined,
  bubblewrapSeed?: ManifestSeed,
  webManifestSeed?: ManifestSeed,
): Promise<string> {
  return prompter.text("Web app URL", {
    defaultValue: explicitValue ?? bubblewrapSeed?.webUrl ?? webManifestSeed?.webUrl,
    validate: (value) => {
      try {
        normalizeHttpUrl(value);
        return undefined;
      } catch (error) {
        return error instanceof Error ? error.message : "Invalid URL.";
      }
    },
  }).then(normalizeHttpUrl);
}

function resolveSigning(
  options: InitCommandOptions,
  bubblewrapSeed?: ManifestSeed,
): SigningConfig | undefined {
  const candidate: SigningConfig = {
    keystorePath:
      options.keystorePath ??
      resolveSeedRelativePath(bubblewrapSeed?.signing?.keystorePath, bubblewrapSeed?.source),
    keyAlias: options.keystoreAlias ?? bubblewrapSeed?.signing?.keyAlias,
    storePasswordEnv:
      options.keystoreStorePasswordEnv ??
      bubblewrapSeed?.signing?.storePasswordEnv,
    keyPasswordEnv:
      options.keystoreKeyPasswordEnv ??
      bubblewrapSeed?.signing?.keyPasswordEnv,
  };

  if (
    !candidate.keystorePath &&
    !candidate.keyAlias &&
    !candidate.storePasswordEnv &&
    !candidate.keyPasswordEnv
  ) {
    return undefined;
  }

  return candidate;
}

function resolveSeedRelativePath(
  candidate: string | undefined,
  manifestSource: string | undefined,
): string | undefined {
  if (!candidate?.trim()) {
    return undefined;
  }

  if (path.isAbsolute(candidate)) {
    return candidate;
  }

  if (!manifestSource) {
    return candidate;
  }

  if (manifestSource.startsWith("http://") || manifestSource.startsWith("https://")) {
    return candidate;
  }

  if (manifestSource.startsWith("file://")) {
    return path.resolve(path.dirname(fileURLToPath(manifestSource)), candidate);
  }

  return path.resolve(path.dirname(manifestSource), candidate);
}

function requireNonEmpty(label: string): (value: string) => string | undefined {
  return (value) => {
    if (!value.trim()) {
      return `${label} is required.`;
    }
    return undefined;
  };
}

function resolveProjectName(
  targetDirectory: string,
  explicitValue: string | undefined,
  fallbackName: string,
): string {
  const trimmedExplicitValue = explicitValue?.trim();
  if (trimmedExplicitValue) {
    return trimmedExplicitValue;
  }

  const inferredName = path.basename(targetDirectory).trim();
  return inferredName || fallbackName;
}

function resolveInitialWebUrl(
  explicitValue: string | undefined,
  bubblewrapSeed?: ManifestSeed,
  webManifestSeed?: ManifestSeed,
): string | undefined {
  const candidate = explicitValue ?? bubblewrapSeed?.webUrl ?? webManifestSeed?.webUrl;
  if (!candidate) {
    return undefined;
  }

  try {
    return normalizeHttpUrl(candidate);
  } catch {
    return undefined;
  }
}

function quoteShellValue(value: string): string {
  return JSON.stringify(value);
}

function resolveInitialAppName(
  explicitValue: string | undefined,
  bubblewrapSeed: ManifestSeed | undefined,
  webManifestSeed: ManifestSeed | undefined,
): string | undefined {
  if (explicitValue?.trim()) {
    return explicitValue.trim();
  }

  if (bubblewrapSeed?.appName) {
    return bubblewrapSeed.appName;
  }

  return webManifestSeed?.appName;
}
