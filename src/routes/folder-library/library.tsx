import { useParams } from "@solidjs/router"
import { OsFolder, OsVideo } from "src/models";
import { Transition } from "solid-transition-group";
import LibraryHeader from "./library-header";
import LibraryVideosSection from "./library-videos-section";
import { createSignal } from "solid-js";
export default function Library() {

  const [osVideos, setOsVideos] = createSignal<OsVideo[]>([]);

  const params = useParams();
  const decodedPath = decodeURIComponent(params.folderPath).replace(/\)$/, ""); // Remove trailing )
  const mainParentFolder: OsFolder = JSON.parse(decodedPath);
	setOsVideos(mainParentFolder.os_videos);

  console.log(mainParentFolder);

  return (
    <Transition
      appear={true}
      onEnter={(el, done) => {
        const a = el.animate([{ opacity: 0 }, { opacity: 1 }], {
          duration: 200
        });
        a.finished.then(done);
      }}
      onExit={(el, done) => {
        const a = el.animate([{ opacity: 1 }, { opacity: 0 }], {
          duration: 600
        });
        a.finished.then(done);
      }}
    >
      <main class="w-full h-[100vh] relative overflow-auto" style={{ "scrollbar-gutter": "stable" }}>
        <LibraryHeader mainParentFolder={mainParentFolder} />
        <LibraryVideosSection mainParentFolder={mainParentFolder} osVideos={osVideos} />
      </main>
    </Transition>
  );
}
