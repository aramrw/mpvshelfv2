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
import { Skeleton } from "../components/ui/skeleton";

export default function Dashboard() {
  const [user, setUser] = createSignal<UserType | null>(null);
  const [osFolders, setOsFolders] = createSignal<OsFolder[]>([]);
  const [error, setError] = createSignal<string | null>(null);
  const navigate = useNavigate();

  onMount(async () => {
    const user = await get_default_user();
    if (user) {
      setUser(user);
      get_os_folders(user.id).then((folders) => {
        if (folders) {
          console.log(folders)
          setOsFolders(folders);
        } else {
          console.log("no folders")
        }
      })
    }
    let error = await mpv_system_check();
    setError(error);
  });

  return (
    <main>
      <NavBar />
      <Show when={error()}>
        <ErrorAlert error={error()!} onClick={() => navigate(`/settings/mpv_ERROR_${error()}`)} />
      </Show>
      <section class="h-fit py-4 px-3 md:px-16 lg:px-36 xl:px-44 flex flex-row gap-2">
        <div class="grid grid-cols-4 gap-2 min-h-[calc(4*cardHeight)]">
          <Show when={user() && osFolders() && osFolders()?.length > 0} fallback={
            <Skeleton class="h-32 w-24 sm:h-44 sm:w-32 md:h-48 md:w-36 lg:h-52 lg:w-40" />
          }>
            <For each={osFolders()}>
              {(folder) => (
                <OsFolderCard folder={folder} user={user} setOsFolders={setOsFolders} />
              )}
            </For>
          </Show>
          <Show when={user()}>
            <AddNewSkeleton user={user} setOsFolders={setOsFolders} />
          </Show>
        </div>
      </section>
    </main>
  );
}
