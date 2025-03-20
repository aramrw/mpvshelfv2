import { useParams } from "@solidjs/router";
import LibraryHeader from "./header/header";
import LibraryVideosSection from "./videos-section";
import { batch, createEffect, createResource, createSignal, Show } from "solid-js";
import NavBar from "../../main-components/navbar";
import get_user_by_id from "../../tauri-cmds/user/get_user_by_id";
import { get_os_videos } from "../../tauri-cmds/os_videos/get_os_videos";
import get_os_folder_by_path from "../../tauri-cmds/os_folders/get_os_folder_by_path";
import { Tabs, TabsContent, TabsIndicator, TabsList, TabsTrigger } from "../../components/ui/tabs";
import { IconDeviceTvFilled, IconFolderFilled } from "@tabler/icons-solidjs";
import LibraryFoldersSection from "./folders-section";
import get_os_folders_by_path from "../../tauri-cmds/os_folders/get_os_folders_by_path";
import upsert_read_os_dir from "../../tauri-cmds/os_folders/upsert_read_os_dir";
import { platform } from "@tauri-apps/plugin-os";

export default function Library() {
  const params = useParams();
  const currentPlatform = platform();
  const folderPath = () => (decodeURIComponent(params.folder));
  const [mainParentFolder] =
    createResource(folderPath, get_os_folder_by_path);
  const [user] =
    createResource(() => (mainParentFolder() ? mainParentFolder()?.user_id : null), get_user_by_id);

  const [osVideos, { mutate: mutateVideos, refetch: refetchChildVideos }] = createResource(
    () => (mainParentFolder() ? mainParentFolder()?.path : null),
    (parentPath: string) => get_os_videos(parentPath).catch((e) => {
      if (!e.includes("0")) {
        console.error(e);
      }
      return null;
    }),
  );

  const [childFolders, { refetch: refetchChildFolders }] =
    createResource(() => (mainParentFolder() ? mainParentFolder()?.path : null),
      (parent_path) => get_os_folders_by_path(parent_path).catch((e) => {
        if (!(e as string).startsWith("OsFolders Not Found")) {
          console.error(e);
        }
        return null;
      }));

  const [hasInitialized, setHasInitialized] = createSignal(false);

  createEffect(async () => {
    // Wait until all resources are ready and the effect has not yet been initialized
    if (
      !hasInitialized() &&
      folderPath() &&
      mainParentFolder() &&
      user() &&
      childFolders.state === "ready" &&
      osVideos.state === "ready"
    ) {
      const isRefetch = await upsert_read_os_dir(
        mainParentFolder()?.path!,
        mainParentFolder()?.parent_path,
        user()!,
        childFolders()!,
        osVideos()!
      );

      if (typeof isRefetch === "boolean" && isRefetch) {
        console.log("refetching because it needs to be hydrated", isRefetch)
        batch(async () => {
          await refetchChildFolders();
          await refetchChildVideos();
        });
      }

      setHasInitialized(true); // Only set after running the logic
    }
  });

  return (
    <main class="relative h-[100dvh] w-full overflow-auto" style={{ "scrollbar-gutter": "stable" }}>
      <NavBar />
      <Tabs class="w-full" orientation="horizontal">
        <Show when={mainParentFolder() && user()}>
          <LibraryHeader
            user={user}
            mainParentFolder={mainParentFolder}
            osVideos={osVideos}
            currentPlatform={currentPlatform}
          />

          <TabsList class="h-9 w-full border">
            <Show when={osVideos()}>
              <TabsTrigger value="videos" class="flex w-fit flex-row gap-x-0.5 lg:text-base">
                Videos
                <IconDeviceTvFilled class="h-auto w-3 p-0" />
              </TabsTrigger>
            </Show>
            <Show when={childFolders()}>
              <TabsTrigger value="folders" class="folders flex w-fit flex-row gap-x-0.5 lg:text-base">
                Folders
                <IconFolderFilled class="ml-0.5 w-3 stroke-[2.4px]" />
              </TabsTrigger>
            </Show>
            <TabsIndicator />
          </TabsList>
          <Show when={osVideos()}>
            <TabsContent value="videos">
              <LibraryVideosSection
                mutate={mutateVideos}
                mainParentFolder={mainParentFolder}
                osVideos={osVideos}
                user={user}
              />
            </TabsContent>
          </Show>
          <Show when={childFolders()}>
            <TabsContent value="folders">
              <LibraryFoldersSection
                user={user}
                mainParentFolder={mainParentFolder}
                childFolders={childFolders}
                currentPlatform={currentPlatform}
              />
            </TabsContent>
          </Show>
        </Show>
      </Tabs>
    </main>
  );
}
