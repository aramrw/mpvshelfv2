import { convertFileSrc } from "@tauri-apps/api/core";
import { Resource, Show } from "solid-js";
import { OsFolder, OsVideo, UserType } from "../../../models";
import { Transition } from "solid-transition-group";
import { Platform } from "@tauri-apps/plugin-os";
import HeaderLastWatchedVideo from "./header-last-watched-video";
import { cn, escapeCSSUrl } from "../../../libs/cn";


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

  console.log(`${mainParentFolder()?.title}'s last watched video:`, mainParentFolder()?.last_watched_video);
  console.log(`${mainParentFolder()?.title}'s cover_img_path: ${mainParentFolder()?.cover_img_path}`);

  return (
    <Transition
      appear={true}
      onEnter={(el, done) => {
        const a = el.animate([{ opacity: 0 }, { opacity: 1 }], { duration: 300 });
        a.finished.then(done);
      }}
      onExit={(el, done) => {
        const a = el.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 300 });
        a.finished.then(done);
      }}
    >
      <header
        class={cn("h-fit w-full py-3 px-2 relative sm:px-2 md:px-16 lg:px-30 xl:px-40 overflow-hidden",
          !mainParentFolder()?.last_watched_video?.cover_img_path || !mainParentFolder()?.cover_img_path && "bg-black/10"
        )}>
        <Show
          when={mainParentFolder() && user()}>
            <div
              class="absolute inset-0 z-0"
              style={{
                "background-image": `linear-gradient(rgba(0, 0, 0, .2), rgba(0, 0, 0, .2)),
  url(${mainParentFolder()?.last_watched_video ?

                    escapeCSSUrl(convertFileSrc(mainParentFolder()?.last_watched_video?.cover_img_path!))
                    :

                    escapeCSSUrl(convertFileSrc(mainParentFolder()?.cover_img_path!))
                  })`,
                "background-color": "#111",
                "background-size": "cover",
                "background-repeat": "no-repeat",
                "background-position": "start",
                filter: "blur(2px)",
              }}
            />
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
					bg-transparent mix-blend-hard-light rounded-[2px]  border-secondary/50 border-[1.5px] shadow-md
					backdrop-blur-lg select-none cursor-default"
            >
              {mainParentFolder()?.update_date}
            </h2>
            <h3
              class="text-secondary mb-2 w-fit font-semibold z-15 relative
					text-xs px-1 lg:text-md
					bg-transparent mix-blend-hard-light rounded-[2px]  border-secondary/50 border-[1.5px] shadow-md
					backdrop-blur-lg select-none cursor-default"
            >
              {mainParentFolder()?.update_time}
            </h3>
          </div>

          <Show when={mainParentFolder()?.last_watched_video}>
            <HeaderLastWatchedVideo
              user={user as () => UserType}
              osVideos={osVideos as () => OsVideo[]}
              currentPlatform={currentPlatform}
              mainParentFolder={mainParentFolder as () => OsFolder}
            />
          </Show>
        </Show>
      </header >
    </Transition>
  );
}

