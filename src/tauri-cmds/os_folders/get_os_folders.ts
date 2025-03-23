import { invoke } from "@tauri-apps/api/core";
import { OsFolder, SortType } from "../../models";

export async function get_os_folders(userId: string, sort?: SortType) {
  let sortType: SortType = "updated";
  if (sort) { sortType = sort };
  const osFolders: OsFolder[] = await invoke("get_os_folders", { userId, sortType });
  return osFolders;
}
