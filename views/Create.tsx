import { useState, useEffect, useRef, useContext } from "react";
import AnnotationFormSchema from "@/assets/schema.json";
import { Form, FormHandle } from "@/components/form/Form";
import { Input } from "@/components/form/Input";
import { Textarea } from "@/components/form/Textarea";
import TypeaheadInput from "@/components/form/Typeahead.input";
import { AnnotationSchema } from "@/types/annotation-schema.interface";
import { AuthenticationContext } from "@/context/authentication.context";
import Toggle from "@/components/form/Toggle";
import { storage } from "#imports";
import { ISettings } from "@/types/settings.interface";

interface AnnotationData {
  selectedText: string;
  url: string;
}

export default function Create() {
  const { isAuthenticated, login } = useContext(AuthenticationContext);
  const formRef = useRef<FormHandle>(null);
  const [annotationData, setAnnotationData] = useState<AnnotationData | null>(
    null
  );
  const [settings, setSettings] = useState<ISettings>({ vocabularies: {} });
  const [isLoadingSettings, setIsLoadingSettings] = useState(true);

  useEffect(() => {
    const loadSettings = async () => {
      try {
        const storedSettings = await storage.getItem<ISettings>(
          "local:settings"
        );
        setSettings(storedSettings || { vocabularies: {} });
      } catch (error) {
        console.error("Failed to load settings:", error);
      } finally {
        setIsLoadingSettings(false);
      }
    };

    loadSettings();
  }, []);

  useEffect(() => {
    const loadPendingData = () => {
      const pendingData = sessionStorage.getItem("pendingAnnotation");
      if (pendingData) {
        const data = JSON.parse(pendingData) as AnnotationData;
        setAnnotationData(data);
        if (isAuthenticated) {
          sessionStorage.removeItem("pendingAnnotation");
        }
      }
    };

    loadPendingData();

    const handleCustomEvent = () => {
      loadPendingData();
    };

    window.addEventListener("pendingAnnotationUpdated", handleCustomEvent);

    return () => {
      window.removeEventListener("pendingAnnotationUpdated", handleCustomEvent);
    };
  }, [isAuthenticated]);

  useEffect(() => {
    if (annotationData && formRef.current) {
      formRef.current.setValue("selectedText", annotationData.selectedText);
      formRef.current.setValue("resource", annotationData.url);
    }
  }, [annotationData]);

  const handleSubmit = (data: Record<string, any>) => {
    console.log("Form submitted with data:", data);

    if ("rememberChoices" in data) {
    }
  };

  if (!isAuthenticated) {
    return (
      <div
        onClick={login}
        className="mx-2 my-12 border border-rda-500 rounded-md bg-white shadow cursor-pointer"
      >
        <p className="px-4 pt-4 text-base font-medium text-center">
          Please authenticate to create annotations.
        </p>
        <p className="text-rda-500 underline text-center font-medium text-base py-4 px-4">
          Login
        </p>
      </div>
    );
  }

  const FormFields = (AnnotationFormSchema as AnnotationSchema).fields.map(
    (field, index) => {
      switch (field.type) {
        case "text":
          return (
            <Input
              key={field.name + index}
              name={field.name}
              label={field.label}
              required={field.required}
              info={field.info}
              disabled={field.disabled}
            />
          );
        case "textarea":
          return (
            <Textarea
              key={field.name + index}
              name={field.name}
              label={field.label}
              required={field.required}
              info={field.info}
            />
          );
        case "combobox":
          if (field.type === "combobox" && field.vocabulary) {
            if (settings.vocabularies?.[field.name] === false) {
              return null;
            }
          }
          return (
            <TypeaheadInput
              key={field.name + index}
              name={field.name}
              label={field.label}
              info={field.info}
              datasource={field.vocabulary}
              required={field.required}
              value={field.defaultValue}
              multiple={field.multiple || false}
            />
          );
        default:
          return <p>Unsupported field type</p>;
      }
    }
  );

  FormFields.unshift(
    <Textarea
      rows={8}
      key="selectedText"
      name="selectedText"
      label="Annotated Fragment"
      required
      info="The text you selected on the page."
      disabled
    />
  );

  if (isLoadingSettings) {
    return <p className="mx-2 my-12">Loading...</p>;
  }

  return (
    <>
      <h2 className="text-xl mx-2 mt-6">Create Annotation</h2>
      <Form ref={formRef} onSubmit={(data) => console.log(data)}>
        <div className="mx-2 mt-4 space-y-4">{FormFields}</div>

        <div className="mx-2 my-4">
          <Toggle
            label={
              <div>
                <p className="font-medium text-gray-900">
                  Remember my choices for next time
                </p>
                <p className="text-gray-500">
                  This includes all vocabulary and keyword choices.
                </p>
              </div>
            }
            name="rememberChoices"
          />
        </div>

        <div className="flex w-full mb-8">
          <button
            type="submit"
            className="mt-4 rounded-md w-full bg-rda-500 px-2.5 mx-2 py-1.5 text-sm font-semibold text-white shadow-xs hover:bg-rda-400 focus-visible:outline-2 cursor-pointer focus-visible:outline-offset-2 focus-visible:outline-rda-500"
          >
            Create Annotation
          </button>
        </div>
      </Form>
    </>
  );
}
