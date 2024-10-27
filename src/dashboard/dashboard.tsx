import { createSignal, For, onMount } from "solid-js";
import NavBar from "../main-components/navbar"
import { OsFolder, UserType } from "src/models";
import AddNewSkeleton from "./components/add-new-skeleton";
import OsFolderCard from "./components/os-folder-card";
import { get_os_folders } from "../tauri-cmds/os_folders";
import { get_default_user } from "../tauri-cmds/users";

function SkeletonPlaceholder({ count }: { count: number }) {
  return Array(count)
    .fill(null)
    .map((_, index) => (
      <div
        class="bg-gray-200 animate-pulse rounded-md h-[calc(cardHeight)] w-full"
      />
    ));
}

export default function Dashboard() {
  const [user, setUser] = createSignal<UserType | null>(null);
  const [osFolders, setOsFolders] = createSignal<OsFolder[]>([]);

  onMount(() => {
    get_default_user().then((user: unknown) => {
      setUser(user as UserType);
    }).then(() => {
      if (user()) {
        get_os_folders(user()!.id).then((folders: unknown) => {
          setOsFolders(folders as OsFolder[]);
          console.log(folders);
        });
      }
    });
  });

  return (
    <main>
      <NavBar />
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
