import { Accessor, createSignal, For, Show } from "solid-js";
import { OsFolder, OsVideo, UserType } from "../../models";
import LibraryVideoCard from "./video-card";
import play_video from "../../tauri-cmds/mpv/play_video";
import ErrorAlert from "../../main-components/error-alert";

export default function LibraryVideosSection({
  user,
  mainParentFolder, osVideos
}: {
  user: UserType,
  mainParentFolder: OsFolder,
  osVideos: OsVideo[]
}
) {

  const [error, setError] = createSignal<string | null>();

  return (
    <>
      <Show when={error()}>
        <ErrorAlert error={error()!} />
      </Show>
      <section
        class="md:px-4 overflow-hidden w-full h-fit px-2 pb-4 relative 
				border-b-white border-b-2 shadow-lg shadow-primary/10">
        <ul
          class="mx-auto h-fit w-fit grid grid-cols-1 sm:grid-cols-2 md:grid-cols-2 md:px-12 lg:grid-cols-3
					xl:grid-cols-3 gap-6 sm:gap-10 justify-center items-center">
          <For each={osVideos}>
            {(video, index) => (
              <LibraryVideoCard
                index={index}
                video={video}
                mainParentFolder={mainParentFolder}
                onClick={async () => {
                  const error = await play_video(mainParentFolder, video, user);
                  if (error) {
                    setError(null)
                    setError(error);
                  }
                }}
              />
            )}
          </For>
        </ul>
      </section>
    </>
  )
}
