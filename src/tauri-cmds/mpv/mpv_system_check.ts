import { invoke } from "@tauri-apps/api/core";

export default async function mpv_system_check(mpvPath?: string): Promise<null | string> {
  try {
    console.log("checking mpv_path: ", mpvPath);
    await invoke("mpv_system_check", { mpvPath });
    return null;
  } catch (e) {
    return e as string;
  }
}

