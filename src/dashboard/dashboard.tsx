import { createSignal, For, onMount, Show } from "solid-js";
import NavBar from "../main-components/navbar"
import { OsFolder, UserType } from "src/models";
import AddNewSkeleton from "./components/add-new-skeleton";
import OsFolderCard from "./components/os-folder-card";
import { get_os_folders } from "../tauri-cmds/os_folders";
import get_default_user from "../tauri-cmds/users";
import mpv_system_check from "../tauri-cmds/mpv/mpv_system_check";
import { ToastRegion, ToastList } from "../components/ui/toast";
import ErrorAlert from "../main-components/error-alert";
import { useNavigate } from "@solidjs/router";

function SkeletonPlaceholder({ count }: { count: number }) {
  return Array(count)
    .fill(null)
    .map((_, _index) => (
      <div
        class="bg-gray-200 animate-pulse rounded-md h-[calc(cardHeight)] w-full"
      />
    ));
}

export default function Dashboard() {
  const [user, setUser] = createSignal<UserType | null>(null);
  const [osFolders, setOsFolders] = createSignal<OsFolder[]>([]);
  const [error, setError] = createSignal<string | null>(null);
  const navigate = useNavigate();

  onMount(async () => {
    let defaultUser = await get_default_user();
    if (defaultUser) {
      setUser(defaultUser);
      get_os_folders(defaultUser.id).then((folders: unknown) => {
        setOsFolders(folders as OsFolder[]);
        console.log(folders);
      });
    }
    let error = await mpv_system_check();
    setError(error);
  });

  return (
    <main>
      <NavBar />
      <Show when={error()}>
        <ErrorAlert error={error()!} onClick={() => navigate("/settings/mpv?ERROR")} />
      </Show>
      <section class="h-fit p-3 md:px-16 lg:px-36 xl:px-44 flex flex-row gap-2">
        <div class="grid grid-cols-4 gap-2 min-h-[calc(4*cardHeight)]">
          <For each={osFolders()} fallback={<SkeletonPlaceholder count={4} />}>
            {(folder) => (
              <OsFolderCard folder={folder} user={user} setOsFolders={setOsFolders} />
            )}
          </For>
          <AddNewSkeleton user={user} setOsFolders={setOsFolders} />
        </div>
      </section>
    </main>
  );
}
