import { createResource, createSignal, For, Show } from "solid-js";
import NavBar from "../main-components/navbar"
import { OsFolder, UserType } from "../models";
import AddNewSkeleton from "./components/add-new-skeleton";
import OsFolderCard from "./components/os-folder-card";
import mpv_system_check from "../tauri-cmds/mpv/mpv_system_check";
import ErrorAlert from "../main-components/error-alert";
import { useNavigate } from "@solidjs/router";
import { get_os_folders } from "../tauri-cmds/os_folders/get_os_folders";
import get_default_user from "../tauri-cmds/user/get_default_user";
import OsVideoCard from "./components/os-video-card";
import { platform } from "@tauri-apps/plugin-os";

export default function Dashboard() {
  const currentPlatform = platform();
  const [user, setUser] = createSignal<UserType | null>(null);
  const [osFolders, { refetch }] = createResource<OsFolder[]>(async () => {
    const user = await get_default_user();
    if (user) {
      const folders = await get_os_folders(user.id);
      setUser(user);
      return folders || [];
    }
    return [];
  });

  const [error] = createResource(async () => {
    const path = await get_default_user().then(user => user?.settings.mpv_path || null);
    if (path) {
      return await mpv_system_check(path);
    }
    return null;
  });
  const navigate = useNavigate();

  return (
    <main>
      <NavBar />
      <Show when={error()}>
        <ErrorAlert error={error()!} onClick={() => navigate(`/settings/mpv_ERROR_${error()}`)} />
      </Show>
      <section class="flex h-fit flex-col flex-wrap gap-2 px-3 py-4 md:px-16 lg:px-36 xl:px-44">
        <div class="flex flex-row gap-3.5 items-end">
          <Show when={user()?.last_watched_video}>
            <OsVideoCard
              video={user()?.last_watched_video!}
              user={user}
              currentPlatform={currentPlatform}
            />
          </Show>
          <AddNewSkeleton user={user} refetch={refetch} />
        </div>
      </section>
      <div class="w-full h-7 bg-popover shadow-sm my-1.5" />
      <section class="flex h-fit flex-col gap-2 px-3 py-4 md:px-16 lg:px-36 xl:px-44">
        <Show
          when={user() && osFolders.state === "ready" && osFolders().length > 0}
        >
          <div class="flex flex-row flex-wrap gap-2.5">
            <For each={osFolders()}>
              {(folder) => (
                <OsFolderCard
                  folder={folder}
                  user={user}
                  refetch={refetch}
                />
              )}
            </For>
          </div>
        </Show>
      </section>
    </main>
  );
}
