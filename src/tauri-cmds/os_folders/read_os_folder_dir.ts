import { invoke } from "@tauri-apps/api/core";
import { OsFolder } from "../../models";

const read_os_folder_dir = async (path: string, userId: string, coverImgPath?: string, updateDatetime?: string[]) => {
    try {
        const osFolder: OsFolder = await invoke("read_os_folder_dir", { path, userId, coverImgPath, updateDatetime });
        return osFolder;
    } catch (error) {
        console.error("read_os_folder_dir", error);
        return null;
    }
}