import { invoke } from "@tauri-apps/api/core";
import { OsFolder } from "../../models";

export default async function delete_os_folders(osFolders: OsFolder[], user?: User) {
  const osFolder: OsFolder = await invoke("delete_os_folders", { osFolders, user });
  return osFolder;
}
