import { invoke } from "@tauri-apps/api/core";
import { OsFolder, SortType } from "../../models";

export default async function get_os_folder_by_path(folderPath: string) {
  const osFolder: OsFolder = await invoke("get_os_folder_by_path", { folderPath });
  return osFolder;
}

