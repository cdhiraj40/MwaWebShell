import path from "node:path";
import { DoctorRuntime, runDoctor } from "../lib/toolchain.js";

export interface DoctorCommandOptions {
  projectDir?: string;
  sdkDir?: string;
  fix?: boolean;
}

export async function runDoctorCommand(
  directory: string | undefined,
  options: DoctorCommandOptions,
  runtime?: DoctorRuntime,
): Promise<void> {
  const projectDirectory = path.resolve(process.cwd(), directory ?? options.projectDir ?? ".");
  await runDoctor(
    {
      projectDirectory,
      sdkDir: options.sdkDir,
      fix: options.fix,
    },
    runtime,
  );
}
