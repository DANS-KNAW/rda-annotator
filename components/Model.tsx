import {
  Dialog,
  DialogBackdrop,
  DialogPanel,
  DialogTitle,
} from "@headlessui/react";

interface ModelProps {
  title: string | React.ReactNode;
  children: React.ReactNode;
  open: boolean;
  setOpen: (value: boolean) => void;
}

export default function Model({ title, children, open, setOpen }: ModelProps) {
  return (
    <Dialog open={open} onClose={setOpen} className="relative z-50 font-roboto">
      <DialogBackdrop
        transition
        className="fixed inset-0 bg-gray-500/75 transition-opacity data-closed:opacity-0 data-enter:duration-300 data-enter:ease-out data-leave:duration-200 data-leave:ease-in"
      />

      {/* Let the page scroll when the panel is taller than the viewport */}
      <div className="fixed inset-0 z-10 overflow-y-auto">
        {/* Center on small screens, add vertical margin on larger */}
        <div className="flex min-h-full items-center justify-center p-2 sm:p-4">
          <DialogPanel
            transition
            className="w-full sm:max-w-sm transform rounded-md bg-white text-left shadow-xl transition-all
                       data-closed:translate-y-4 data-closed:opacity-0 data-enter:duration-300 data-enter:ease-out
                       data-leave:duration-200 data-leave:ease-in data-closed:sm:translate-y-0 data-closed:sm:scale-95
                       px-2 py-2 sm:p-6
                       max-h-[calc(100vh-4rem)] overflow-y-auto"
          >
            <DialogTitle as="h3" className="sr-only">
              {title}
            </DialogTitle>

            {children}
          </DialogPanel>
        </div>
      </div>
    </Dialog>
  );
}
