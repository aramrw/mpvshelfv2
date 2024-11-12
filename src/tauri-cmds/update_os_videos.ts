import { invoke } from "@tauri-apps/api/core";
import { OsVideo } from "../models";

export async function update_os_videos(osVideos: OsVideo[]) {
  try {
    await invoke("update_os_videos", { osVideos });
  } catch (error) {
    console.error("get_os_videos:", error);
  }
}


