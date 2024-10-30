import { useParams } from "@solidjs/router"
import { OsFolder, OsVideo, UserType } from "../../models";
import { Transition } from "solid-transition-group";
import LibraryHeader from "./library-header";
import LibraryVideosSection from "./library-videos-section";
import { createResource, Show } from "solid-js";
import NavBar from "../../main-components/navbar";
import get_user_by_id from "../../tauri-cmds/get_user_by_id";
import { get_os_videos } from "../../tauri-cmds/os_videos";
import get_os_folder_by_path from "../../tauri-cmds/mpv/get_os_folder_by_path";
import { Tabs, TabsContent, TabsIndicator, TabsList, TabsTrigger } from "../../components/ui/tabs";
import { IconDeviceTvFilled, IconFolderFilled } from "@tabler/icons-solidjs";

const fetchFolder = async (folderPath: string): Promise<OsFolder | null> => {
  return await get_os_folder_by_path(folderPath);
};

const fetchUser = async (userId: string): Promise<UserType | null> => {
  return await get_user_by_id(userId);
}

const fetchVideos = async (folderPath: string): Promise<OsVideo[] | null> => {
  return await get_os_videos(folderPath);
}

export default function Library() {
  const params = useParams();
  const folderPath = decodeURIComponent(params.folder).replace(/\)$/, ""); // Remove trailing )

  const [mainParentFolder] = createResource(folderPath, fetchFolder);

  const [user] = createResource(
    () => mainParentFolder() ? mainParentFolder()?.user_id : null,
    fetchUser
  );

  const [osVideos] = createResource(
    () => mainParentFolder() ? mainParentFolder()?.path : null,
    fetchVideos
  );

  return (
    <Transition
      appear={true}
      onEnter={(el, done) => {
        const a = el.animate([{ opacity: 0 }, { opacity: 1 }], { duration: 200 });
        a.finished.then(done);
      }}
      onExit={(el, done) => {
        const a = el.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 600 });
        a.finished.then(done);
      }}
    >
      <main class="w-full h-[100vh] relative overflow-auto" style={{ "scrollbar-gutter": "stable" }}>
        <NavBar />
        <Tabs
          defaultValue="videos"
          class="w-full"
          orientation="horizontal"
        //value={selectedTab()}
        //onChange={setSelectedTab}
        //disabled={errorMessage ? true : false}
        >
          <Show when={mainParentFolder.latest && osVideos.latest && user.latest}>
            <LibraryHeader mainParentFolder={mainParentFolder.latest!} user={user.latest!} />
            <TabsList class="w-full h-9 border">
              <TabsTrigger value="videos" class="w-fit lg:text-base flex flex-row gap-x-0.5">
                Videos
                <IconDeviceTvFilled class="w-3 h-auto p-0" />
              </TabsTrigger>
              <TabsTrigger value="folders" class="w-fit lg:text-base folders flex flex-row gap-x-0.5">
                Folders
                <IconFolderFilled class="ml-0.5 w-3 stroke-[2.4px]" />
              </TabsTrigger>
              <TabsIndicator />
            </TabsList>
            <TabsContent value="videos">
              <LibraryVideosSection mainParentFolder={mainParentFolder.latest!} osVideos={osVideos.latest!} user={user.latest!} />
            </TabsContent>
          </Show>
        </Tabs>
      </main>
    </Transition >
  );
}
