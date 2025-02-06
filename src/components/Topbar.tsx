import Breadcrumbs from "./Breadcrumbs";
import NavigationTabs from "./NavigationTabs";

export default function Topbar({
  handleSidebar,
  isSidebarOpen,
}: {
  handleSidebar: () => void;
  isSidebarOpen: boolean;
}) {
  return (
    <>
      <div className="w-full h-20 relative border-b border-l border-white px-8 bg-gradient-to-br from-rda-500 from-20% via-rda-600 via-60% to-brown-500 to-100%">
        <button
          onClick={handleSidebar}
          className="size-10 flex justify-center items-center text-white absolute top-0 -left-5 bg-rda-500 rounded-bl-md border-b border-l border-white"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
            strokeWidth={3}
            stroke="currentColor"
            className={`size-6 transition ease-out duration-200 transform ${
              isSidebarOpen ? "rotate-180" : "rotate-0"
            }`}
            aria-none="true"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M15.75 19.5 8.25 12l7.5-7.5"
            />
          </svg>
          <div
            className={
              'after:absolute after:-bottom-[1px] after:left-[calc(50%-1px)] after:w-[calc(50%+1px)] after:h-[1px] after:bg-rda-500 after:content-[""]'
            }
          ></div>
        </button>
        <div className="flex justify-between">
          <div className="pt-2">
            <h1 className="uppercase italic text-white text-2xl -mt-1">
              <span className="font-black">RDA Annotator</span>
              <span className="font-normal text-base ml-2">v0.13</span>
            </h1>
            <div className="mt-3">
              <Breadcrumbs />
            </div>
          </div>
          <div className="relative h-20 w-32">
            <img
              src={chrome.runtime.getURL("images/tiger.png")}
              alt="RDA-TIGER"
              className="absolute h-tiger -bottom-2 z-50"
            />
          </div>
        </div>
      </div>
      <NavigationTabs />
    </>
  );
}
