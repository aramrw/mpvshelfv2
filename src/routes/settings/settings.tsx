import { Accessor, createEffect, createResource, createSignal, onMount, Setter, Show } from "solid-js";
import {
  Tabs,
  TabsIndicator,
  TabsList,
  TabsTrigger,
} from "../../components/ui/tabs";

import { useParams, Params } from "@solidjs/router";
import MpvTabSection from "./tab-sections/mpv";
import get_default_user from "../../tauri-cmds/user/get_default_user";
import { SettingsType, UserType } from "../../models";
import { IconAdjustments, IconDatabase } from "@tabler/icons-solidjs";
import IconMpv from "../../main-components/icons/icon-mpv";
import ProfileTabSection from "./tab-sections/profile";
import SettingsErrorCard from "./tab-sections/error-card";
import NavBar from "../../main-components/navbar";
import { Transition } from "solid-transition-group";
import update_user from "../../tauri-cmds/user/update-user";
import DataTabSection from "./tab-sections/data";

const handleSettingParams = (params: Params): string[] | string => {
  // example param: mpv_ERROR_Error: This is a test Error.
  const decodedParams = decodeURIComponent(params.section).split("_");

  if (decodedParams.length > 1) {
    // would be ["mpv", "Error: This is a test Error"].
    return [decodedParams[0], decodedParams.slice(2).join("_")];
  }

  // would just be "mpv"
  return decodedParams[0];
}

export default function Settings() {

  const rawParams = useParams();
  const params = handleSettingParams(rawParams);
  const errorMessage = typeof params === "string" ? null : params[1];

  const [selectedTab, setSelectedTab] =
    createSignal<string>(typeof params === "string" ? params : params[0]);
  const [user] = createResource<UserType | null>(get_default_user);
  const [opts, setOpts] = createSignal<SettingsType | undefined>();

  // Only set opts once when user is initially loaded:
  createEffect(() => {
    const u = user();
    if (u && !opts()) {
      setOpts(u.settings);
    }
  });


  // When options change, update the user accordingly:
  createEffect(async () => {
    const currentUser = user();
    const currentSettings = opts();
    if (currentUser && currentSettings) {
      // Only update if settings have changed
      if (JSON.stringify(currentUser.settings) !== JSON.stringify(currentSettings)) {
        console.log("updating user settings:\n", currentSettings);
        await update_user({ ...currentUser, settings: currentSettings });
      }
    }
  });


  return (
    <>
      <NavBar />
      <Transition
        appear={true}
        onEnter={(el, done) => {
          const a = el.animate([
            { opacity: 0 },
            { opacity: 1 }],
            { duration: 300 });
          a.finished.then(done);
        }}
        onExit={(el, done) => {
          const a = el.animate([
            { opacity: 1 },
            { opacity: 0 }],
            { duration: 300 });
          a.finished.then(done);
        }}
      >

        <main
          class=" w-full h-full pt-10 lg:pt-20 
					p-3 md:px-16 lg:px-36 xl:px-52 flex flex-col 
					justify-center items-center">
          <header
            class=" border-2 rounded-t-lg bg-popover 
						py-5 pt-4 px-6 border-b-2 border-muted 
						mb-2 w-full rounded-[3px] shadow-lg">
            <h1
              class="text-3xl select-none font-semibold 
							underline flex flex-row 
							justify-start items-center gap-1">
              Settings
              <IconAdjustments
                class="stroke-[1.7] h-9 w-auto"
              />
            </h1>
          </header>
          {errorMessage &&
            <SettingsErrorCard message={errorMessage}
            />
          }
          <Tabs
            defaultValue="mpv"
            class="w-full"
            orientation="vertical"
            value={selectedTab()}
            onChange={setSelectedTab}
            disabled={errorMessage ? true : false}
          >
            <TabsList class="rounded-bl-lg w-40 min-w-20 h-fit">
              <TabsTrigger value="mpv">
                Mpv
                <IconMpv
                  class="ml-0.5 w-3 stroke-[2.4px]"
                />
              </TabsTrigger>
              <TabsTrigger value="data">
                Data
                <IconDatabase
                  class="ml-0.5 w-3 stroke-[2.4px]"
                />
              </TabsTrigger>
              <TabsIndicator />
            </TabsList>
            <Show when={user.latest}>
              <ProfileTabSection user={user.latest!} />
              <MpvTabSection
                user={user.latest!}
                opts={opts as Accessor<SettingsType>}
                setOpts={setOpts as Setter<SettingsType>}
              />
              <DataTabSection
                user={user.latest!}
                opts={opts as Accessor<SettingsType>}
                setOpts={setOpts as Setter<SettingsType>}
              />
            </Show>
          </Tabs>
        </main>
      </Transition>
    </>
  );
};


