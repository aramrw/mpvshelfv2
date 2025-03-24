import { invoke } from "@tauri-apps/api/core";
import { OsFolder, SortType } from "../../models";

export default async function get_os_folders_by_path(parentPath: string, sort?: SortType) {
  let sortType: SortType = "Updated";
  if (sort) { sortType = sort };
	console.log(sortType);
  const osFolders: OsFolder[] = await invoke("get_os_folders_by_path", { parentPath, sortType });
  return osFolders;
}

