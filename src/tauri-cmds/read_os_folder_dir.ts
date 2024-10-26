
import { invoke } from "@tauri-apps/api/core";
import { OsFolder } from "src/models";

const readOsFolderDir = async (path: string, userId: string) => {
  try {
    const osFolder: OsFolder = await invoke("read_os_folder_dir", { path, userId });
    return osFolder;
  } catch (error) {
    console.error("readOsFolderDir", error);
    return null;
  }
}

export default readOsFolderDir;
