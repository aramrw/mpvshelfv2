import { invoke } from "@tauri-apps/api/core";
import { OsVideo } from "../models";

export async function get_os_videos(mainFolderPath: string) {
  try {
    const osFolders: OsVideo[] = await invoke("get_os_videos", { mainFolderPath });
    return osFolders;
  } catch (error) {
    console.error("get_os_videos:", error);
    return null;
  }
}

