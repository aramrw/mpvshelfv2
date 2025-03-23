import { invoke } from "@tauri-apps/api/core";
import { OsFolder } from "../../models";

const update_os_folders = async (osFolders: OsFolder[], userId: string) => {
    try {
        const osFolder: OsFolder = await invoke("update_os_folders", { osFolders, userId });
        return osFolder;
    } catch (error) {
        console.error("update_os_folders", error);
        return null;
    }
}
