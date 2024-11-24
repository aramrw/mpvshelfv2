import { createEffect, createResource, createSignal, For, onMount, Show } from "solid-js";
import NavBar from "../main-components/navbar"
import { OsFolder, UserType } from "../models";
import AddNewSkeleton from "./components/add-new-skeleton";
import OsFolderCard from "./components/os-folder-card";
import { get_os_folders } from "../tauri-cmds/os_folders";
import get_default_user from "../tauri-cmds/users";
import mpv_system_check from "../tauri-cmds/mpv/mpv_system_check";
import ErrorAlert from "../main-components/error-alert";
import { useNavigate } from "@solidjs/router";

export default function Dashboard() {
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
      <section class="h-fit py-4 px-3 md:px-16 lg:px-36 xl:px-44 flex flex-row gap-2">
        <div class="grid grid-cols-4 gap-2">
          <Show
            when={user() && osFolders.state === "ready" && osFolders()!.length > 0}
          >
            <For each={osFolders()}>
              {(folder) => (
                <OsFolderCard folder={folder} user={user} refetch={refetch} />
              )}
            </For>
          </Show>
          <AddNewSkeleton user={user} refetch={refetch} />
        </div>
      </section>
    </main>
  );
}
