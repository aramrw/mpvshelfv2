import "../App.css";
import { IconAdjustments, IconArrowNarrowLeftDashed, IconChalkboard, IconDeviceDesktopAnalytics, IconList, IconMenu } from "@tabler/icons-solidjs";
import {
  Sheet,
  SheetContent,
  SheetTrigger
} from "../components/ui/sheet";
import { A, useNavigate } from "@solidjs/router";

export default function NavBar() {

  const navigate = useNavigate();

  return (
    <nav class="z-[100] h-8 w-full bg-primary shadow-md sm:px-2 md:px-16 lg:px-36 xl:px-44">
      <ul class="flex h-full w-full flex-row items-center justify-between">
        <Sheet>
          <div class="flex h-full flex-row">
            <li class="flex h-full cursor-pointer flex-row items-center justify-center px-1 transition-colors hover:bg-accent"
              onClick={() => navigate(-1)}
            >
              <IconArrowNarrowLeftDashed class="fill-accent stroke-[2] text-secondary" />
            </li>
            <SheetTrigger class="h-full outline-none">
              <li class="flex h-full cursor-pointer flex-row items-center justify-center px-1 transition-colors hover:bg-accent">
                <IconMenu class="fill-accent stroke-[2] text-secondary" />
              </li>
            </SheetTrigger>
          </div>
          <SheetContent side="top" class="flex items-center justify-center border-none p-0 sm:px-2 md:px-16 lg:px-36 xl:px-44">
            <ul class="flex h-full w-full flex-row items-center">
              <li class="flex h-full cursor-pointer flex-row items-center justify-center p-1 transition-colors hover:bg-accent">
                <A href="/dashboard">
                  <IconChalkboard class="fill-accent stroke-[1.5] text-secondary" />
                </A>
              </li>
              <li class="flex h-full w-5 flex-row items-center justify-center p-1">
              </li>
              <li class="flex h-full cursor-pointer flex-row items-center justify-center p-1 transition-colors hover:bg-accent">
                <IconList class="fill-accent stroke-[2] text-secondary" />
              </li>
              <li class="flex h-full cursor-pointer flex-row items-center justify-center p-1 transition-colors hover:bg-accent">
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
        <div class="flex h-full w-fit flex-row">
          <li class="flex h-full cursor-pointer flex-row items-center justify-center px-1 transition-colors hover:bg-accent">
            <IconDeviceDesktopAnalytics class="fill-accent stroke-[1.5] text-secondary" />
          </li>
          <li class="flex h-full cursor-pointer flex-row items-center justify-center px-1 transition-colors hover:bg-accent">
            <A href="/settings/default">
              <IconAdjustments class="fill-accent stroke-[1.5] text-secondary" />
            </A>
          </li>
        </div>
      </ul>
    </nav>
  );
}
