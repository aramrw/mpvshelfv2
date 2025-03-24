import { invoke } from "@tauri-apps/api/core";
import { OsVideo, SortType } from "../../models";

export async function get_os_videos_from_path(mainFolderPath: string, sort?: SortType) {
  let sortType: SortType = "Updated";
  if (sort) { sortType = sort };
  const osFolders: OsVideo[] = await invoke("get_os_videos_from_path", { mainFolderPath, sortType });
  return osFolders;
}

