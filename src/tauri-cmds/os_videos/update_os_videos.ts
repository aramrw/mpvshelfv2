import { invoke } from "@tauri-apps/api/core";
import { OsVideo, UserType } from "../../models";

export async function update_os_videos(osVideos: OsVideo[]) {
  await invoke("update_os_videos", { osVideos });
}


