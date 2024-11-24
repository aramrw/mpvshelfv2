import { convertFileSrc } from "@tauri-apps/api/core";
import { Resource, Show } from "solid-js";
import { OsFolder, OsVideo, UserType } from "../../models";
import play_video from "../../tauri-cmds/mpv/play_video";
import { calcTimestampAvg } from "./video-card";
import { Transition } from "solid-transition-group";
import { VideoDescription } from "../../main-components/description/video-desc";

export default function ({
  user,
  mainParentFolder,
  osVideos,
}: {
  user: Resource<UserType | null>;
  mainParentFolder: Resource<OsFolder | null>;
  osVideos: Resource<OsVideo[] | null>;
}) {

  return (
    <Transition
      appear={true}
      onEnter={(el, done) => {
        const a = el.animate([{ opacity: 0 }, { opacity: 1 }], { duration: 600 });
        a.finished.then(done);
      }}
      onExit={(el, done) => {
        const a = el.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 600 });
        a.finished.then(done);
      }}
    >
      <header class="min-h-96 sm:px-2 md:px-16 lg:px-30 xl:px-40 w-full h-fit py-3 px-2 relative">
        <Show when={mainParentFolder() && user()}>
          <Show when={mainParentFolder() && mainParentFolder()?.last_watched_video?.cover_img_path}>
            <div
              class="absolute inset-0 z-0"
              style={{
                "background-image": `linear-gradient(rgba(0,0,0,.2),rgba(0,0,0,.2)),url(${convertFileSrc(mainParentFolder()?.last_watched_video?.cover_img_path!)})`,
                "background-size": "cover",
                "background-repeat": "no-repeat",
                "background-position": "center",
                filter: "blur(9px)",
              }}
            />
          </Show>
          <h1
            class="text-secondary/70 bg-transparent mix-blend-difference w-fit font-semibold z-10 relative text-medium md:text-xl
        lg:text-2xl shadow-2xl px-0.5 border-secondary/70 border-2 mb-1"
          >
            {mainParentFolder()?.title}
          </h1>
          <div class="w-fit flex flex-row items-center gap-1">
            <h2
              class="text-secondary/50 mb-2 text-xs w-fit font-semibold z-15 relative
					bg-transparent mix-blend-difference border-secondary/50 border-[1.5px] px-1 shadow-md"
            >
              {mainParentFolder()?.update_date}
            </h2>
            <h3
              class="text-secondary/50 mb-2 text-xs w-fit font-semibold z-15 relative
					bg-transparent mix-blend-difference border-secondary/50 border-[1.5px] px-1 shadow-md"
            >
              {mainParentFolder()?.update_time}
            </h3>
          </div>
          <div class="relative w-fit flex items-start gap-2 group cursor-pointer">
            {/* Flex container for the image and SVG */}
            <Show when={mainParentFolder()?.title && mainParentFolder()?.last_watched_video && osVideos()}>
              {/* Duration Bar */}
              <div
                class="w-full h-full absolute left-0 top-0 bg-primary/50"
              />
              {/* Position Bar with blurred background */}
              <div
                class="h-full absolute left-0 top-0 bg-secondary mix-blend-difference backdrop-blur-md"
                style={{
                  width:
                    `${calcTimestampAvg(
                      mainParentFolder()?.last_watched_video?.position!,
                      mainParentFolder()?.last_watched_video?.duration!
                    )}%`
                }}
              />
              <img
                alt={mainParentFolder()?.title}
                src={convertFileSrc(mainParentFolder()?.last_watched_video?.cover_img_path!)}
                class="select-none object-contain
              h-[220px] md:h-[270px] lg:h-[290px] xl:h-[315px]
              w-auto z-30 p-2
              border-white/10 shadow-md"
              />
              <svg
                class="text-secondary fill-secondary/80 bg-primary/70 rounded-sm transition-all duration-200
              cursor-pointer h-auto w-1/4 p-1 mix-blend-hard-light absolute z-50 shadow-md shadow-primary/20"
                style={{
                  top: "50%",
                  left: "50%",
                  transform: "translate(-50%, -50%)", // Center the Play button within the image
                }}
                xmlns="http://www.w3.org/2000/svg"
                width="30"
                height="30"
                viewBox="0 0 24 24"
                stroke-width="2"
                stroke-linecap="round"
                stroke-linejoin="round"
              >
                <polygon points="6 3 20 12 6 21 6 3" />
              </svg>
              <VideoDescription
                video={() => mainParentFolder()?.last_watched_video!}
                onClick={async () => await play_video(
                  mainParentFolder()!,
                  osVideos()!,
                  mainParentFolder()?.last_watched_video!,
                  user()!
                )}
              />
            </Show>
          </div>
        </Show>
      </header >
    </Transition>
  );
}
