import { convertFileSrc } from "@tauri-apps/api/core";
import { Resource, Show } from "solid-js";
import { OsFolder, OsVideo, UserType } from "../../models";
import play_video from "../../tauri-cmds/mpv/play_video";
import { calcTimestampAvg } from "./video-card";
import { Transition } from "solid-transition-group";
import { VideoDescription } from "../../main-components/description/video-desc";
import { ContextMenu, ContextMenuTrigger } from "../../components/ui/context-menu";
import GenericContextMenu from "../../main-components/generic-context-menu";
import { Platform } from "@tauri-apps/plugin-os";

export function escapeCSSUrl(url: string) {
  return url.replace(/\(/g, '\\(').replace(/\)/g, '\\)');
}

export default function ({
  user,
  mainParentFolder,
  osVideos,
  currentPlatform,
}: {
  user: Resource<UserType | null>;
  mainParentFolder: Resource<OsFolder | null>;
  osVideos: Resource<OsVideo[] | null>;
  currentPlatform: Platform,
}) {

  console.log(mainParentFolder()?.last_watched_video)

  return (
    <Transition
      appear={true}
      onEnter={(el, done) => {
        const a = el.animate([{ opacity: 0 }, { opacity: 1 }], { duration: 150 });
        a.finished.then(done);
      }}
      onExit={(el, done) => {
        const a = el.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 150 });
        a.finished.then(done);
      }}
    >
      <header
        class="h-fit w-full py-3 px-2 relative
				sm:px-2 md:px-16 lg:px-30 xl:px-40">
        <Show
          when={mainParentFolder() && user()}>
          <Show
            when={mainParentFolder()
              && mainParentFolder()?.last_watched_video?.cover_img_path}
          >
            <div
              class="absolute inset-0 z-0"
              style={{
                "background-image": `linear-gradient(rgba(0,0,0,.2),rgba(0,0,0,.2)),
						url(${mainParentFolder()?.last_watched_video ?
                    escapeCSSUrl(
                      convertFileSrc(mainParentFolder()?.last_watched_video?.cover_img_path!)) :
                    escapeCSSUrl(
                      convertFileSrc(mainParentFolder()?.cover_img_path!))
                  })`,
                "background-size": "cover",
                "background-repeat": "no-repeat",
                "background-position": "start",
                filter: "blur(6px)",
              }}
            />
          </Show>
          <h1
            class="text-secondary/100 mix-blend-hard-light w-fit font-semibold z-10 relative
				text-2xl px-1 md:text-3xl md:py-0.5
				shadow-2xl rounded-[2px] border-secondary/70 border-2 mb-1 backdrop-blur-xl cursor-default"
          >
            {mainParentFolder()?.title}
          </h1>
          <div class="w-fit flex flex-row items-center gap-1">
            <h2
              class="text-secondary mb-2 w-fit font-semibold z-15 relative
					text-xs px-1 lg:text-md
					bg-transparent mix-blend-luminosity rounded-[2px]  border-secondary/50 border-[1.5px] shadow-md
					backdrop-blur-lg select-none cursor-default"
            >
              {mainParentFolder()?.update_date}
            </h2>
            <h3
              class="text-secondary mb-2 w-fit font-semibold z-15 relative
					text-xs px-1 lg:text-md
					bg-transparent mix-blend-luminosity rounded-[2px] border-secondary/50 border-[1.5px] shadow-md
					backdrop-blur-lg select-none cursor-default"
            >
              {mainParentFolder()?.update_time}
            </h3>
          </div>

          <Show when={mainParentFolder()?.last_watched_video}>
            <ContextMenu>
              <ContextMenuTrigger
                class="relative w-fit flex items-start gap-2 group cursor-pointer">
                {/* Flex container for the image and SVG */}
                <Show when={mainParentFolder()?.title && mainParentFolder()?.last_watched_video && osVideos()}>
                  {/* Duration Bar */}
                  <div
                    class="w-full h-full absolute left-0 top-0 bg-primary/50"
                  />
                  {/* Position Bar */}
                  <div
                    class="h-full absolute left-0 top-0 bg-secondary mix-blend-difference backdrop-blur-md"
                    style={{
                      width: (() => {
                        const avg = calcTimestampAvg(
                          mainParentFolder()?.last_watched_video?.position!,
                          mainParentFolder()?.last_watched_video?.duration!
                        );
                        if (avg > 1) {
                          return `${avg}%`;
                        }
                        return "0%"
                      })(),
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
              </ContextMenuTrigger>
              <GenericContextMenu
                item={() => mainParentFolder()?.last_watched_video!}
                currentPlatform={currentPlatform}
              />
            </ContextMenu>
          </Show>
        </Show>
      </header >
    </Transition>
  );
}
