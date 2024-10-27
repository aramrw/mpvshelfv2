import { convertFileSrc } from "@tauri-apps/api/core";
import { Show } from "solid-js";
import { OsFolder } from "src/models";

export default function ({ mainParentFolder }: { mainParentFolder: OsFolder }) {
  return (
    <header class="w-full h-64 md:h-72 lg:h-[330px] py-3 px-2 relative border-b-white border-b-2">
      <div
        class="absolute inset-0 z-0"
        style={{
          "background-image": `linear-gradient(rgba(0,0,0,.2),rgba(0,0,0,.2)),url(${convertFileSrc(mainParentFolder?.cover_img_path!)})`,
          "background-size": "cover",
          "background-repeat": "no-repeat",
          "background-position": "center",
          filter: "blur(6px)",
        }}
      />
      <svg
        class="text-zinc-700 fill-zinc-700 hover:text-zinc-400 hover:fill-zinc-400 transition-all
           cursor-pointer h-12 w-12 p-1
					mix-blend-plus-lighter absolute 
					left-[5px] top-[75px] z-50"
        xmlns="http://www.w3.org/2000/svg"
        width="30"
        height="30"
        viewBox="0 0 24 24"
        stroke-width="2"
        stroke-linecap="round"
        stroke-linejoin="round">
        <polygon points="6 3 20 12 6 21 6 3" />
      </svg>
      <h1 class="text-zinc-600 bg-transparent mix-blend-difference w-fit font-semibold z-10 relative text-medium md:text-xl 
				lg:text-2xl shadow-2xl rounded-none px-0.5 border-zinc-600 border-2 mb-1" >
        {mainParentFolder?.title}
      </h1>
      <div class="w-fit flex flex-row items-center gap-1">
        <h2 class="text-zinc-700 mb-2 text-xs w-fit font-semibold z-15 relative bg-transparent mix-blend-plus-lighter rounded-none border-primary border-[1.5px] px-1 shadow-md">
          {mainParentFolder?.update_date}
        </h2>
        <h3 class="text-zinc-700 mb-2 text-xs w-fit font-semibold z-15 relative bg-transparent mix-blend-plus-lighter rounded-none border-primary border-[1.5px] px-1 shadow-md">
          {mainParentFolder?.update_time}
        </h3>
      </div>
      <div class="flex flex-row justify-start items-start gap-2">
        <Show when={mainParentFolder.title && mainParentFolder.cover_img_path}>
          <img
            alt={mainParentFolder?.title}
            src={convertFileSrc(mainParentFolder?.cover_img_path!)}
            class="select-none relative h-[175px] md:h-[200px] object-contain lg:h-[240px] 
						w-auto z-100 rounded-none 
						border-transparent border-2 shadow-md"
          />
        </Show>
      </div>
    </header>
  )
}
