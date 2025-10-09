export function Topbar() {
  const tigerUrl = browser.runtime.getURL("/tiger.png");

  return (
    <div className="w-full h-[5.5rem] relative px-4 bg-gradient-to-br from-rda-500 from-20% via-rda-600 via-60% to-brown-500 to-100%">
      <div className="flex justify-between items-center pt-2">
        <h1 className="uppercase italic text-white text-2xl -mt-1">
          <span className="font-black">RDA&nbsp;Annotator</span>
          <span className="font-normal text-base ml-2">v0.110.0</span>
        </h1>
        <div className="relative h-20 w-32">
          <img
            src={tigerUrl}
            alt="RDA-TIGER"
            className="absolute h-tiger -bottom-2 z-50"
          />
        </div>
      </div>
    </div>
  );
}
