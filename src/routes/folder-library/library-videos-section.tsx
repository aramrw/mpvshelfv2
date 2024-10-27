import { convertFileSrc } from "@tauri-apps/api/core"; import { Accessor, For } from "solid-js";
import { OsFolder, OsVideo, UserType } from "src/models";
import LibraryVideoCard from "./library-video-card";

export default function LibraryVideosSection(
  { mainParentFolder, osVideos }:
    {
      mainParentFolder: OsFolder,
      osVideos: Accessor<OsVideo[]>
    }
) {
  return (
    <section class="md:px-20 lg:px-28 overflow-hidden w-full h-fit px-2 pb-4 relative border-b-white border-b-2 shadow-lg shadow-primary/10">
      {/* <div */}
      {/*   class="absolute inset-0 z-0" */}
      {/*   style={{ */}
      {/*     "background-image": `linear-gradient(rgba(0,0,0,.2),rgba(0,0,0,.3)),url(${convertFileSrc(mainParentFolder?.cover_img_path!)})`, */}
      {/*     "background-size": "contain", */}
      {/*     "background-repeat": "repeat", */}
      {/*     "background-position": "center", */}
      {/*     filter: "blur(40px)", */}
      {/*   }} */}
      {/* /> */}
      <h1 class="h-fit text-zinc-500 
				mix-blend-plus-lighter shadow-md 
				w-fit pointer-events-none 
				select-none font-medium mb-2">
				<p class="lg:text-transparent">Videos</p>
      </h1>
      <ul class="mx-auto h-fit w-fit grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-6 sm:gap-10 justify-center items-center">
        <For each={osVideos()}>
          {(video) => (
            <LibraryVideoCard video={video} mainParentFolder={mainParentFolder} />
          )}
        </For>
      </ul>
    </section>
  )
}
