import {
  Combobox,
  ComboboxButton,
  ComboboxInput,
  ComboboxOption,
  ComboboxOptions,
  Label,
} from "@headlessui/react";
import { useState, useEffect } from "react";
import { UseFormRegister, Control, useController } from "react-hook-form";
import Modal from "@/components/Model";
import useDataSource from "@/hooks/useDataSource";
import { DataSource, PredefinedDataSource } from "@/types/datasource.interface";
import { VocabularyOptions } from "@/types/annotation-schema.interface";

interface TypeaheadProps
  extends Omit<React.InputHTMLAttributes<HTMLInputElement>, "name" | "value"> {
  register?: UseFormRegister<any>;
  control?: Control<any>;
  info?: string;
  label: string;
  datasource: PredefinedDataSource | DataSource[];
  value?: string | string[];
  name: string;
  multiple?: boolean;
  vocabularyOptions?: VocabularyOptions;
}

export default function TypeaheadInput({
  label,
  datasource,
  control,
  name,
  value,
  info,
  multiple = false,
  vocabularyOptions,
  ...rest
}: TypeaheadProps) {
  const [query, setQuery] = useState("");
  const [showInfo, setShowInfo] = useState(false);
  const { data, loading, error } = useDataSource(datasource, vocabularyOptions);

  if (!control) {
    console.error("TypeaheadInput requires control prop from react-hook-form");
    return null;
  }

  const { field } = useController({
    name,
    control,
    defaultValue: multiple ? [] : null,
  });

  useEffect(() => {
    if (
      data.length > 0 &&
      value &&
      (multiple ? !field.value?.length : !field.value)
    ) {
      if (multiple && Array.isArray(value)) {
        const defaultItems = data.filter((item) => value.includes(item.value));
        if (defaultItems.length > 0) {
          field.onChange(defaultItems);
        }
      } else if (!multiple && typeof value === "string") {
        const defaultItem = data.find((item) => item.value === value);
        if (defaultItem) {
          field.onChange(defaultItem);
        }
      }
    }
  }, [data, value, field.value, multiple]);

  const filteredItems =
    query === ""
      ? data
      : data.filter((item) => {
          const matchesLabel = item.label
            .toLowerCase()
            .includes(query.toLowerCase());
          const matchesSecondary = item.secondarySearch
            ? item.secondarySearch.toLowerCase().includes(query.toLowerCase())
            : false;

          return matchesLabel || matchesSecondary;
        });

  const availableItems = multiple
    ? filteredItems.filter(
        (item) =>
          !(field.value || []).some(
            (selected: DataSource) => selected?.value === item.value
          )
      )
    : filteredItems;

  const handleSelect = (item: DataSource) => {
    setQuery("");
    if (multiple) {
      if (item) {
        const currentValues = field.value || [];
        field.onChange([...currentValues, item]);
      }
    } else {
      field.onChange(item);
    }
  };

  const handleRemove = (itemToRemove: DataSource) => {
    if (multiple) {
      const newValues = (field.value || []).filter((item: DataSource) => {
        return item.value !== itemToRemove.value;
      });
      field.onChange(newValues);
    }
  };

  const selectedValues = multiple ? (field.value || []).filter(Boolean) : [];

  return (
    <div>
      {info && (
        <Modal title={label} open={showInfo} setOpen={() => setShowInfo(false)}>
          <div className="text-sm mb-8 relative">
            <div className="sticky -top-2 z-10 bg-white pb-2 pt-4">
              <div className="text-base flex justify-between items-center">
                <span className="font-semibold">{label}</span>
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                  strokeWidth={1.5}
                  stroke="currentColor"
                  aria-label="Close"
                  className="size-6 hover:text-rda-500 cursor-pointer"
                  onClick={() => setShowInfo(false)}
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M6 18 18 6M6 6l12 12"
                  />
                </svg>
              </div>
            </div>
            <div
              className="mt-4 prose prose-a:underline prose-a:text-rda-500"
              dangerouslySetInnerHTML={{ __html: info || "" }}
            />
          </div>
        </Modal>
      )}
      <Combobox
        as="div"
        value={multiple ? null : field.value}
        onChange={handleSelect}
        disabled={loading}
      >
        <div className="flex items-center justify-between">
          <Label
            htmlFor={name + "-input"}
            className="block text-sm/6 font-medium text-gray-900"
          >
            {label} {rest.required && <span className="text-red-500">*</span>}
          </Label>
          {info && (
            <button
              className="hover:text-rda-500 cursor-pointer"
              type="button"
              title="More info"
              onClick={() => setShowInfo(!showInfo)}
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
                strokeWidth={1.5}
                stroke="currentColor"
                className="size-6"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="m11.25 11.25.041-.02a.75.75 0 0 1 1.063.852l-.708 2.836a.75.75 0 0 0 1.063.853l.041-.021M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Zm-9-3.75h.008v.008H12V8.25Z"
                />
              </svg>
            </button>
          )}
        </div>

        {/* Selected badges - shown above the input */}
        {multiple && selectedValues.length > 0 && (
          <div className="flex flex-wrap gap-2 mt-2">
            {selectedValues.map((item: DataSource) => (
              <span
                key={item.value}
                className="inline-flex items-center gap-1 rounded-md bg-rda-500 px-2 py-1 text-xs font-medium text-white"
              >
                {item.label}
                <button
                  type="button"
                  onClick={() => handleRemove(item)}
                  className="inline-flex items-center justify-center hover:bg-rda-600 rounded"
                  aria-label={`Remove ${item.label}`}
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    fill="none"
                    viewBox="0 0 24 24"
                    strokeWidth={2}
                    stroke="currentColor"
                    className="size-3"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M6 18 18 6M6 6l12 12"
                    />
                  </svg>
                </button>
              </span>
            ))}
          </div>
        )}

        <div className="relative mt-2">
          <div className="absolute inset-y-0 left-0 flex items-center rounded-l-md px-2">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth={1.5}
              stroke="currentColor"
              className="size-4 text-gray-400"
              aria-hidden="true"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="m21 21-5.197-5.197m0 0A7.5 7.5 0 1 0 5.196 5.196a7.5 7.5 0 0 0 10.607 10.607Z"
              />
            </svg>
          </div>
          <ComboboxInput
            className="block w-full rounded-md bg-white py-1 pl-8 pr-12 text-sm/6 text-gray-900 outline-gray-300 placeholder:text-gray-400 focus:outline-2 focus:-outline-offset-2 focus:outline-rda-500 disabled:bg-gray-100 disabled:cursor-not-allowed"
            onChange={(event) => setQuery(event.target.value)}
            onBlur={() => setQuery("")}
            displayValue={(item: DataSource | DataSource[] | undefined) => {
              if (multiple) return "";
              return (item as DataSource)?.label ?? "";
            }}
            required={
              rest.required && (!multiple || selectedValues.length === 0)
            }
            placeholder={loading ? "Loading..." : undefined}
          />
          <ComboboxButton className="absolute inset-y-0 right-0 flex items-center rounded-r-md px-2 focus:outline-hidden">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth={1.5}
              stroke="currentColor"
              className="size-5 text-gray-400"
              aria-hidden="true"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M8.25 15 12 18.75 15.75 15m-7.5-6L12 5.25 15.75 9"
              />
            </svg>
          </ComboboxButton>

          <ComboboxOptions
            transition
            className="absolute z-10 mt-1 max-h-60 w-full overflow-auto rounded-md bg-white py-1 text-sm shadow outline outline-black/5 data-leave:transition data-leave:duration-100 data-leave:ease-in data-closed:data-leave:opacity-0"
          >
            {error && (
              <div className="cursor-default px-3 py-2 text-red-600 select-none">
                <span className="block truncate">Error: {error}</span>
              </div>
            )}

            {!error && availableItems.length === 0 && (
              <div className="cursor-default px-3 py-2 text-gray-900 select-none data-focus:bg-rda-500 data-focus:text-white data-focus:outline-hidden">
                <span className="block truncate">
                  {loading
                    ? "Loading..."
                    : multiple && selectedValues.length > 0
                    ? "(No more results)"
                    : "(No results found)"}
                </span>
              </div>
            )}

            {!error &&
              availableItems.map((item) => (
                <ComboboxOption
                  key={item.value}
                  value={item}
                  className="group cursor-default px-3 py-2 text-gray-900 select-none data-focus:bg-rda-500 data-focus:text-white data-focus:outline-hidden"
                >
                  <span className="block break-words">{item.label}</span>
                  {item.description && (
                    <span className="block break-words text-gray-500 group-data-[focus]:text-gray-200 text-sm">
                      {item.description}
                    </span>
                  )}
                </ComboboxOption>
              ))}
          </ComboboxOptions>
        </div>
      </Combobox>
    </div>
  );
}
