export type UserType = {
  id: string,
  username: string,
  settings: SettingsType,
}

export type SettingsType = {
  user_id: string,
  mpv_path?: string,
  plugins_path?: string,
  autoplay: boolean,
  update_date: string,
  update_time: string,
}

export type UserFormType = {
  username: string,
}

export type OsFolder = {
  user_id: string,
  path: string,
  title: string,
  os_videos: OsVideo[],
  last_watched_video: OsVideo,
  cover_img_path: string | undefined,
  update_date: string,
  update_time: string,
}

export type OsVideo = {
  user_id: string,
  main_folder_path: string,
  path: string,
  title: string,
  cover_img_path: string | undefined,
  watched: bool,
  update_date: string,
  update_time: string,
}
