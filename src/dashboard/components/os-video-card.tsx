import { OsVideo, UserType } from "../../models";
import { Accessor, createResource, Show } from "solid-js";
import { convertFileSrc } from "@tauri-apps/api/core";
import {
  ContextMenu,
  ContextMenuTrigger,
} from "../../components/ui/context-menu";
import { Platform } from '@tauri-apps/plugin-os';
import { Transition } from "solid-transition-group";
import { VideoDescription } from "../../main-components/description/video-desc";
import play_video from "../../tauri-cmds/mpv/play_video";
import get_os_folder_by_path from "../../tauri-cmds/os_folders/get_os_folder_by_path";
import { get_os_videos_from_path } from "../../tauri-cmds/os_videos/get_os_videos";
import GenericContextMenu from "../../main-components/generic-context-menu";


const OsVideoCard = ({
  video,
  user,
  currentPlatform,
}: {
  video: OsVideo,
  user: Accessor<UserType | null>,
  currentPlatform: Platform,
}
) => {
  let [mainParentFolder] = createResource(video.main_folder_path, get_os_folder_by_path);

  const [osVideos, { mutate: _mutateVideos, refetch: _refetchChildVideos }] = createResource(
    () => (mainParentFolder() ? mainParentFolder()?.path : null),
    (parentPath: string) => get_os_videos_from_path(parentPath),
  );

  return (
    <Transition
      appear={true}
      onEnter={(el, done) => {
        const a = el.animate([{ opacity: 0 }, { opacity: 1 }], {
          duration: 100
        });
        a.finished.then(done);
      }}
      onExit={(el, done) => {
        const a = el.animate([{ opacity: 1 }, { opacity: 0 }], {
          duration: 100
        });
        a.finished.then(done);
      }}
    >
      <ContextMenu>
        <ContextMenuTrigger>
          <div class="group w-fit flex items-center transition-all 
						cursor-pointer duration-200 ease-in-out select-none will-change-auto">
            <div
              class="
							w-52 h-52
							md:h-60 md:w-60
							lg:h-64 lg:w-64
							rounded-sm shadow-md bg-white 
							flex items-center justify-center overflow-hidden relative will-change-transform "
              onClick={() => {
                if (mainParentFolder.state === "ready"
                  && osVideos.state === "ready"
                  && user()) {
                  play_video(mainParentFolder()!, osVideos()!, video, user()!)
                }
              }}>
              <div class="video-card-container absolute inset-0">
                <Show when={video.cover_img_path}>
                  <img
                    src={convertFileSrc(video.cover_img_path!)}
                    class="object-cover w-full h-full relative z-10"
                  />
                </Show>
              </div>
              <Show when={!video.cover_img_path}>
                <span class="mix-blend-multiply px-2 text-sm font-medium whitespace-nowrap overflow-hidden relative z-10">
                  {video.title}
                </span>
              </Show>
              <VideoDescription
                video={() => video}
              />
            </div>
          </div>
        </ContextMenuTrigger>
        <GenericContextMenu
          item={() => video}
          currentPlatform={currentPlatform}
        />
      </ContextMenu>
    </Transition>
  );
};

export default OsVideoCard;

