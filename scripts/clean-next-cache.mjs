import { rmSync } from "node:fs";

rmSync(".next", { force: true, recursive: true });
