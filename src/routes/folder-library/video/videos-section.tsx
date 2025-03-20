import { createSignal, For, Resource, Setter, Show } from "solid-js";
import { OsFolder, OsVideo, UserType } from "../../../models";
import LibraryVideoCard from "./video-card";
import play_video from "../../../tauri-cmds/mpv/play_video";
import ErrorAlert from "../../../main-components/error-alert";
import { platform } from "@tauri-apps/plugin-os";
import { Transition } from "solid-transition-group";

export default function LibraryVideosSection({
  user,
  mainParentFolder,
  osVideos,
  mutate,
}: {
  user: Resource<UserType | null>;
  mainParentFolder: Resource<OsFolder | null>;
  osVideos: Resource<OsVideo[] | null>;
  mutate: Setter<OsVideo[] | null | undefined>
}) {
  const currentPlatform = platform();
  const [error, setError] = createSignal<string | null>();

  return (
    <>
      <Show when={error()}>
        <ErrorAlert error={error()!} />
      </Show>
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
        <Show when={osVideos.state === "ready" && mainParentFolder.state === "ready"}>
          <section
            class="md:px-4 overflow-hidden w-full h-fit px-2 pb-4 pt-2 relative
				border-b-white border-b-2 shadow-lg shadow-primary/10"
          >
            <ul
              class="mx-auto 
						h-fit w-fit justify-center items-center
						grid grid-cols-1 sm:grid-cols-2 md:grid-cols-2 md:px-12 lg:grid-cols-3
						xl:grid-cols-3 gap-6"
            >
              <For each={osVideos()}>
                {(video, index) => (
                  <LibraryVideoCard
                    index={() => index() + 1}
                    video={video}
                    mainParentFolder={mainParentFolder}
                    currentPlatform={currentPlatform}
                    mutate={mutate}
                    onClick={async () => {
                      await play_video(mainParentFolder()!, osVideos()!, video, user()!);
                    }}
                  />
                )}
              </For>
            </ul>
          </section>
        </Show>
      </Transition>
    </>
  );
}
