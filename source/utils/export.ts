import { mkdir, writeFile } from "node:fs/promises";
import { dirname } from "node:path";

interface ExportJsonOptions {
  readonly data: unknown;
  readonly filePath: string;
}

export async function exportJsonToFile({
  data,
  filePath,
}: ExportJsonOptions): Promise<void> {
  await mkdir(dirname(filePath), { recursive: true });
  const payload = JSON.stringify(
    data,
    (_key, value) => (typeof value === "bigint" ? value.toString() : value),
    2,
  );
  await writeFile(filePath, payload, "utf-8");
}
