import { Accessor, createResource, createSignal, For, Show } from "solid-js";
import NavBar from "../main-components/navbar"
import { OsFolder, OsVideo, UserType } from "../models";
import AddNewSkeleton from "./components/add-new-skeleton";
import OsFolderCard from "./components/os-folder-card";
import mpv_system_check from "../tauri-cmds/mpv/mpv_system_check";
import ErrorAlert from "../main-components/error-alert";
import { useNavigate } from "@solidjs/router";
import { get_os_folders } from "../tauri-cmds/os_folders/get_os_folders";
import get_default_user from "../tauri-cmds/user/get_default_user";
import { platform } from "@tauri-apps/plugin-os";
import HeaderLastWatchedVideo from "../routes/folder-library/header/header-last-watched-video";
import { get_os_videos_from_path } from "../tauri-cmds/os_videos/get_os_videos";
import get_os_folder_by_path from "../tauri-cmds/os_folders/get_os_folder_by_path";
import { Transition } from "solid-transition-group";
import Spinner from "../main-components/icons/spinner";

export default function Dashboard() {
  const currentPlatform = platform();
  const [user, setUser] = createSignal<UserType | null>(null);
  const [osFolders, { refetch }] = createResource<OsFolder[]>(async () => {
    const user = await get_default_user();
    if (user) {
      const folders = await get_os_folders(user.id)
        .catch((e) => {
          if (!(e as String).includes("0")) {
            console.error(e);
          }
        });
      setUser(user);
      return folders || [];
    } return [];
  });

  const [error] = createResource(async (): Promise<null | string> => {
    const path = await get_default_user().
      then(user => user?.settings.mpv_settings.exe_path || undefined);
    const res = await mpv_system_check(path);
    if (typeof res === "string") {
      console.error(res);
      return res;
    }
    return null;
  });
  const navigate = useNavigate();


  /*  */
  const [mainParentFolder] = createResource(async () => {
    let user = await get_default_user();
    let parent = user?.last_watched_video?.main_folder_path
    if (parent === undefined) {
      alert!("error finding last watched video");
      return null;
    }
    return get_os_folder_by_path(parent);
  });

  const [osVideos] = createResource(
    () => (mainParentFolder()?.path ? mainParentFolder()?.path : null),
    (parentPath: string) => get_os_videos_from_path(parentPath, "Updated"),
  );

  return (
    <main
      class="relative h-[100dvh] w-full overflow-auto "
      style={{ "scrollbar-gutter": "stable" }}
    >
      <NavBar />
      <Show when={error()}>
        <ErrorAlert
          error={error()!}
          onClick={() =>
            navigate(`/settings/mpv_ERROR_${error()}`)}
        />
      </Show>
      <Show when={mainParentFolder.state === "ready"}
        fallback={<div class="w-full h-full flex justify-center items-center"><Spinner class="w-1/2 h-1/2 text-muted opacity-40" /></div>}
      >
        <section class="flex h-fit flex-col flex-wrap gap-2 px-3 py-4 md:px-16 lg:px-36 xl:px-44">
          <div class="flex flex-row gap-3.5 items-end">
            <Show when={
              user()?.last_watched_video
              && mainParentFolder()
            }>
              <HeaderLastWatchedVideo
                user={user as () => UserType}
                osVideos={osVideos as () => OsVideo[]}
                mainParentFolder={mainParentFolder as () => OsFolder}
                currentPlatform={currentPlatform}
              />
            </Show>
            <Show when={user()}>
              <AddNewSkeleton
                user={user as Accessor<UserType>}
                refetch={refetch}
              />
            </Show>
          </div>
        </section>
        <Show when={mainParentFolder.state === "ready"}>
          <div class="w-full h-7 bg-popover shadow-sm my-1.5" />
        </Show>
        <section class="flex h-fit flex-col gap-2 px-3 py-4 md:px-16 lg:px-36 xl:px-44">
          <Show
            when={user() && osFolders.state === "ready" && osFolders().length > 0}
          >
            <Transition
              appear={true}
              onEnter={(el, done) => {
                const a = el.animate([{ opacity: 0 }, { opacity: 1 }], {
                  duration: 300
                });
                a.finished.then(done);
              }}
              onExit={(el, done) => {
                const a = el.animate([{ opacity: 1 }, { opacity: 0 }], {
                  duration: 300
                });
                a.finished.then(done);
              }}
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
            </Transition>
          </Show>
        </section>
        <Show when={mainParentFolder.state === "ready"}>
          <div class="w-full h-7 bg-popover shadow-sm my-1.5" />
        </Show>
      </Show>
    </main>
  );
}
