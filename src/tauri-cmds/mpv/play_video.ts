import { invoke } from "@tauri-apps/api/core";
import { OsFolder, OsVideo, UserType } from "../../models";

export default async function play_video(mainFolder: OsFolder, osVideos: OsVideo[], video: OsVideo, user: UserType) {
  console.log(`playing video: ${video}`);
  await invoke("play_video", { mainFolder, osVideos, video, user });
}
