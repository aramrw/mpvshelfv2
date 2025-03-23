import { invoke } from "@tauri-apps/api/core";
import { OsVideo, SortType } from "../../models";

export async function get_os_videos(mainFolderPath: string, sort?: SortType) {
  let sortType: SortType = "updated";
  if (sort) { sortType = sort };
  const osFolders: OsVideo[] = await invoke("get_os_videos", { mainFolderPath, sortType });
  return osFolders;
}

