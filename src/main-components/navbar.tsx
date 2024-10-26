import "../App.css";
import { IconAdjustments, IconAdjustmentsSpark, IconChalkboard, IconDeviceDesktopAnalytics, IconHome, IconList, IconMenu, IconMovie, IconPlaylist, IconSettings } from "@tabler/icons-solidjs";
import {
  Sheet,
  SheetContent,
  SheetTrigger
} from "../components/ui/sheet";


export default function NavBar() {
  return (
    <nav class="w-full h-8 bg-primary shadow-md">
      <ul class="h-full w-full flex flex-row items-center justify-between">
        <Sheet>
          <SheetTrigger class="h-full outline-none">
            <li class="px-1 h-full flex flex-row justify-center items-center hover:bg-accent transition-colors cursor-pointer">
              <IconMenu class="text-secondary fill-accent stroke-[2]" />
            </li>
          </SheetTrigger>
          <SheetContent side="top" class="p-0 flex justify-center items-center border-none">
            <ul class="h-full w-full flex flex-row items-center">
              <li class="p-1 h-full flex flex-row justify-center items-center hover:bg-accent transition-colors cursor-pointer">
                <IconChalkboard class="text-secondary fill-accent stroke-[1.5]" />
              </li>
              <li class="p-1 w-5 h-full flex flex-row justify-center items-center">
              </li>
              <li class="p-1 h-full flex flex-row justify-center items-center hover:bg-accent transition-colors cursor-pointer">
                <IconList class="text-secondary fill-accent stroke-[2]" />
              </li>
              <li class="p-1 h-full flex flex-row justify-center items-center hover:bg-accent transition-colors cursor-pointer">
                <svg xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 24 24" fill="none" stroke-width="1.5"
                  stroke-linecap="round" stroke-linejoin="round" class="h-6 w-auto stroke-secondary p-0.5">
                  <path d="M20.2 6 3 11l-.9-2.4c-.3-1.1.3-2.2 1.3-2.5l13.5-4c1.1-.3 2.2.3 2.5 1.3Z" />
                  <path d="m6.2 5.3 3.1 3.9" />
                  <path d="m12.4 3.4 3.1 4" />
                  <path d="M3 11h18v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2Z" />
                </svg>
              </li>
            </ul>
          </SheetContent>
        </Sheet>
        <div class="w-fit flex flex-row h-full">
          <li class="px-1 h-full flex flex-row justify-center items-center hover:bg-accent transition-colors cursor-pointer">
            <IconDeviceDesktopAnalytics class="text-secondary fill-accent stroke-[1.5]" />
          </li>
          <li class="px-1 h-full flex flex-row justify-center items-center hover:bg-accent transition-colors cursor-pointer">
            <IconAdjustments class="text-secondary fill-accent stroke-[1.5]" />
          </li>
        </div>
      </ul>
    </nav>
  );
}
