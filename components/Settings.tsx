"use client";
import React from "react";
import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { IoSettingsSharp } from "react-icons/io5";
import { CiTextAlignLeft, CiTextAlignRight } from "react-icons/ci";
import { twMerge } from "tailwind-merge";
import { useLayout } from "@/app/LayoutProvider";

const Settings: React.FC = () => {
  const [active, setActive] = useState<boolean>(false);
  const toggle = (): void => setActive((prev) => !prev);
  const { setIsRTL } = useLayout();
  const pathname = usePathname();

  // THE BOARD IS ALSO SERVED WITHOUT ITS /tv/ PREFIX, which is why the guard
  // below was not working.
  //
  // `tv.tellmewhat2play.com/ABC-123` is the URL the Cloud Function hands out
  // and the one venues actually open. It is rewritten to the /tv/ route, so
  // Next renders the board while the BROWSER's path stays `/ABC-123` — and
  // usePathname reports what the browser has. So the prefix test passed only
  // on the long www URL, and a green gear sat on the right edge of every wall
  // display opened the short way: burn-in on a screen left up all night, and
  // a stray control an audience can poke. Reported 2026-11-21, cause found
  // 2026-11-22.
  //
  // Resolved after mount rather than during render: the host is not knowable
  // on the server, and reading it while rendering would mismatch hydration.
  // Rendering nothing until it is known means the gear appears a beat late on
  // the real site, which costs nothing, and NEVER appears on the board --
  // the right way round for a control that must not reach a wall.
  const [onBoardHost, setOnBoardHost] = useState<boolean | null>(null);
  useEffect(() => {
    const host = window.location.hostname.toLowerCase();
    setOnBoardHost(host === "tv.tellmewhat2play.com" || host.startsWith("tv."));
  }, []);

  // The venue TV board is an audience-facing wall display with nobody at a
  // mouse — a floating gear is just something to burn into the screen.
  if (onBoardHost !== false) return null;
  if (pathname?.startsWith("/tv/")) return null;

  return (
    <div dir="ltr" className="z-40  fixed top-1/2 right-0 ">
      <button
        onClick={toggle}
        className="py-[10px] relative z-40 shadow-md rounded-s bg-lime cursor-pointer  pl-[14px] pr-4 text-white hover:text-black hover:bg-white duration-500  h-10"
      >
        <IoSettingsSharp />
      </button>

      <div
        className={twMerge(
          "absolute w-fit   bg-rose  top-1/2 -translate-y-1/2  shadow-md right-14  p-4 rounded transition-all duration-300",
          active
            ? "translate-x-0 opacity-100 scale-100"
            : "translate-x-[140%] opacity-0 scale-75"
        )}
      >
        <div>
          <h6 className="font-bold uppercase border-b-2 border-black pb-1 text-black text-sm text-nowrap">
            Layout
          </h6>
          <div className="flex items-center pt-2 text-4xl gap-2">
            <CiTextAlignLeft
              title="left to right"
              onClick={(): void => setIsRTL(false)}
              className="bg-white cursor-pointer  size-8 rounded"
            />
            <CiTextAlignRight
              title="right to left"
              onClick={(): void => setIsRTL(true)}
              className="bg-white cursor-pointer  size-8 rounded"
            />
          </div>
        </div>
      </div>
    </div>
  );
};
export default Settings;
