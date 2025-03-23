import { invoke } from "@tauri-apps/api/core";
import { OsFolder, OsVideo, UserType } from "../../models";

export default async function upsert_read_os_dir(
  dir: String,
  parentPath: String | undefined,
  user: UserType,
  oldDirs: OsFolder[] | undefined,
  oldVideos: OsVideo[] | undefined
) {
  return await invoke("upsert_read_os_dir", { dir, parentPath, user, oldDirs, oldVideos }) as boolean;
}

